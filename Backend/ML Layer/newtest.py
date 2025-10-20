import warnings
warnings.filterwarnings('ignore')

import os
import sys
import logging
import joblib
from typing import Dict, List, Tuple, Optional, Union, Any
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler, OneHotEncoder, MinMaxScaler
from sklearn.decomposition import TruncatedSVD
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.neighbors import LocalOutlierFactor
from sklearn.model_selection import ParameterGrid, train_test_split

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Dependency checks
try:
    import hdbscan
except ImportError:
    raise ImportError("hdbscan is required. Install with: pip install hdbscan")

try:
    import tensorflow as tf
    from tensorflow.keras.layers import Input, Dense, Concatenate, Dropout, BatchNormalization
    from tensorflow.keras.models import Model
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    from tensorflow.keras.optimizers import Adam
    # Set memory growth for GPU if available
    gpus = tf.config.experimental.list_physical_devices('GPU')
    if gpus:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
except ImportError:
    raise ImportError("TensorFlow is required for the Conditional Autoencoder. Install with: pip install tensorflow")

# ==================== CONFIGURATION ====================
@dataclass
class Config:
    """Centralized configuration for the pipeline"""
    input_path: str = 'synthetic_healthcare_fraud_data.csv'
    output_path: str = 'anomalies_ensemble_results.csv'
    output_path_all: str = 'anomalies_all_scores.csv'
    random_state: int = 42
    high_cardinality_threshold: int = 10
    top_n_explain: int = 100
    global_contamination: float = 0.01  
    local_contamination: float = 0.01   
    svd_components_per_cat: int = 3
    min_cluster_size: int = 30
    min_samples: int = 10
    max_categories_for_svd: int = 200
    cae_epochs: int = 100
    cae_batch_size: int = 64
    cae_patience: int = 10
    
    # Feature columns
    suggested_columns: List[str] = None
    
    def __post_init__(self):
        if self.suggested_columns is None:
            self.suggested_columns = [
                'Claim_ID', 'Member_ID', 'Provider_ID', 'Provider_country_code', 'Claimed_currency_code',
                'Payment_currency_code', 'Payee_type', 'Payee_rule_code', 'Gender', 'Age',
                'Treatment from date', 'Treatment_to_date', 'Claim_invoice_date',
                'Claim_invoice_gross_total_amount', 'Paid_amount', 'Incident_count',
                'specialisation_code', 'Provider_type_code', 'Benefit_head_code',
                'diagnosis_code', 'Procedure_code', 'Benefit_head_descr', 'Diagnostic name', 'Procedure_descr', 'Provider__descr',
                'Treatment_Country', 'Provider type'
            ]

config = Config()

# ==================== DATA LOADING & CLEANING ====================
class DataProcessor:
    """Handles all data loading, cleaning, and feature engineering"""
    
    def __init__(self, config: Config):
        self.config = config
        self.date_cols = ['Treatment from date', 'Treatment_to_date', 'Claim_invoice_date']
        
    def load_and_clean(self, path: str) -> pd.DataFrame:
        """Load data with robust error handling"""
        if not os.path.exists(path):
            raise FileNotFoundError(f"Input file not found: {path}")
            
        logger.info(f"Loading data from {path}")
        df = pd.read_csv(path)
        
        # Select available columns
        available_cols = [c for c in self.config.suggested_columns if c in df.columns]
        df = df[available_cols].copy()
        logger.info(f"Using {len(available_cols)} columns out of {len(self.config.suggested_columns)} suggested")
        
        # Process dates efficiently
        df = self._process_dates(df)
        
        # Convert currencies to USD
        df = self._convert_currencies(df)
        
        # Handle numeric columns
        df = self._clean_numerics(df)
        
        return df
    
    def _convert_currencies(self, df: pd.DataFrame) -> pd.DataFrame:
        """Convert different currencies to USD"""
        if 'Paid_amount' not in df.columns or 'Claimed_currency_code' not in df.columns:
            return df

        logger.info("Converting currencies to USD")
        
        # Hardcoded conversion rates (as of late 2025)
        # In a production system, these should be fetched from a reliable API
        conversion_rates = {
            'USD': 1.0,
            'EUR': 1.18,
            'GBP': 1.35,
            'CHF': 1.26
        }
        
        # Apply conversion
        df['original_currency'] = df['Claimed_currency_code']
        df['conversion_rate'] = df['Claimed_currency_code'].map(conversion_rates).fillna(1.0)
        df['Paid_amount'] = df['Paid_amount'] * df['conversion_rate']
        
        # Drop intermediate columns
        df.drop(columns=['conversion_rate'], inplace=True)
        
        return df
    
    def _process_dates(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process date columns and create temporal features"""
        for col in self.date_cols:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors='coerce')
        
        # Create temporal features
        if 'Treatment from date' in df.columns and 'Treatment_to_date' in df.columns:
            df['Duration'] = (df['Treatment_to_date'] - df['Treatment from date']).dt.days
            df['Duration'] = df['Duration'].clip(lower=0)  # Ensure no negative durations
            
        if 'Claim_invoice_date' in df.columns:
            if 'Treatment_to_date' in df.columns:
                df['Claim_Delay'] = (df['Claim_invoice_date'] - df['Treatment_to_date']).dt.days
                
            df['Invoice_DayOfWeek'] = df['Claim_invoice_date'].dt.dayofweek
            df['Invoice_Month'] = df['Claim_invoice_date'].dt.month
            df['Invoice_Quarter'] = df['Claim_invoice_date'].dt.quarter
            df['Invoice_IsWeekend'] = (df['Invoice_DayOfWeek'] >= 5).astype(int)
        
        # Drop original date columns
        df.drop(columns=[col for col in self.date_cols if col in df.columns], inplace=True)
        
        return df
    
    def _clean_numerics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean numeric columns with robust handling and outlier capping"""
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

        for col in numeric_cols:
            # Replace infinities
            df[col].replace([np.inf, -np.inf], np.nan, inplace=True)

            # Handle extreme outliers using IQR method
            if df[col].notna().any():
                # Fill NaN with median (more robust than mean)
                median_val = df[col].median()
                df[col].fillna(median_val, inplace=True)
            else:
                df[col].fillna(0, inplace=True)

        return df
    
    def create_interaction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create meaningful interaction features"""
        logger.info("Creating interaction features")
        
        # Payment ratio features
        if 'Paid_amount' in df.columns and 'Claim_invoice_gross_total_amount' in df.columns:
            df['Paid_to_Claimed_Ratio'] = (
                df['Paid_amount'] / df['Claim_invoice_gross_total_amount'].replace(0, 1e-6)
            ).clip(0, 10)  # Cap extreme ratios
            
            # Flag suspicious payment patterns
            df['Full_Payment_Flag'] = (df['Paid_to_Claimed_Ratio'] >= 0.99).astype(int)
        
        # # Provider-level features
        # if 'Provider_ID' in df.columns:
        #     agg_dict = {}
        #     if 'Paid_amount' in df.columns:
        #         agg_dict['Paid_amount'] = ['mean', 'std', 'count']
        #     if 'Member_ID' in df.columns:
        #         agg_dict['Member_ID'] = ['nunique']

        #     # Only proceed if we have something to aggregate
        #     if agg_dict:
        #         provider_stats = df.groupby('Provider_ID').agg(agg_dict)

        #         # Flatten column names
        #         provider_stats.columns = ['_'.join(col).strip() for col in provider_stats.columns.values]

        #         # Merge back efficiently
        #         df = df.merge(provider_stats, left_on='Provider_ID', right_index=True, how='left')

        #         # Deviation from provider average
        #         if 'Paid_amount' in df.columns and 'Paid_amount_mean' in df.columns:
        #             df['Provider_Payment_Deviation'] = (
        #                 df['Paid_amount'] - df['Paid_amount_mean']
        #             ) / df['Paid_amount_std'].replace(0, 1).fillna(1)
        
        # # Member-level features
        # if 'Member_ID' in df.columns:
        #     member_agg_dict = {}
        #     if 'Paid_amount' in df.columns:
        #         member_agg_dict['Paid_amount'] = ['sum']
        #     if 'Provider_ID' in df.columns:
        #         member_agg_dict['Provider_ID'] = ['nunique']

        #     # Only proceed if we have something to aggregate
        #     if member_agg_dict:
        #         member_stats = df.groupby('Member_ID').agg(member_agg_dict)

        #         # Flatten column names properly
        #         flattened_cols = ['_'.join(c).strip() for c in member_stats.columns.values]
        #         member_stats.columns = [
        #             'Member_Total_Paid' if 'Paid_amount' in col else 'Member_Provider_Count'
        #             for col in flattened_cols
        #         ]

        #         df = df.merge(member_stats, left_on='Member_ID', right_index=True, how='left')
        
        return df

# ==================== FEATURE ENCODING ====================
class FeatureEncoder:
    """Handles categorical encoding with frequency encoding and SVD for high cardinality"""
    
    def __init__(self, config: Config):
        self.config = config
        self.encoders = {}
        self.svd_models = {}
        self.feature_mapping = {}  # Store mapping from original to encoded features
        
    def encode_categoricals(self, df: pd.DataFrame) -> pd.DataFrame:
        """Encode categorical variables with optimal strategy"""
        logger.info("Encoding categorical variables")
        df_encoded = df.copy()
        
        cat_cols = df_encoded.select_dtypes(include=['object', 'category']).columns.tolist()
        
        if not cat_cols:
            return df_encoded
            
        # Split by cardinality
        low_card = []
        high_card = []
        
        for col in cat_cols:
            n_unique = df_encoded[col].nunique()
            if n_unique <= self.config.high_cardinality_threshold:
                low_card.append(col)
            else:
                high_card.append(col)
        
        logger.info(f"Low cardinality columns ({len(low_card)}): {low_card[:5]}")
        logger.info(f"High cardinality columns ({len(high_card)}): {high_card[:5]}")
        
        # Process high cardinality columns and track mapping
        for col in high_card:
            df_encoded = self._encode_high_cardinality(df_encoded, col)
        
        # Process low cardinality columns and track mapping
        if low_card:
            df_encoded = self._encode_low_cardinality(df_encoded, low_card)
        
        # Final cleanup
        df_encoded.fillna(0, inplace=True)
        
        return df_encoded
    
    def _encode_high_cardinality(self, df: pd.DataFrame, col: str) -> pd.DataFrame:
        """Encode high cardinality column with frequency encoding + SVD"""
        # Track encoded features for this column
        encoded_features = []
        
        # Frequency encoding
        freq = df[col].value_counts(normalize=True)
        df[f'{col}_freqenc'] = df[col].map(freq).fillna(0.0)
        encoded_features.append(f'{col}_freqenc')
        
        # Target encoding simulation (using frequency as proxy)
        df[f'{col}_log_freq'] = np.log1p(df[f'{col}_freqenc'])
        encoded_features.append(f'{col}_log_freq')
        
        # Top-N categories for one-hot + SVD
        topn = min(self.config.max_categories_for_svd, 
                   max(50, int(df[col].nunique() * 0.1)))
        top_categories = freq.head(topn).index.tolist()
        
        # Create one-hot encoding for top categories
        one_hot = pd.get_dummies(
            df[col].where(df[col].isin(top_categories)).fillna('OTHER'),
            prefix=col
        )
        
        # Apply SVD if beneficial
        if one_hot.shape[1] > self.config.svd_components_per_cat + 1:
            n_components = min(self.config.svd_components_per_cat, one_hot.shape[1] - 1)
            svd = TruncatedSVD(n_components=n_components, random_state=self.config.random_state)
            reduced = svd.fit_transform(one_hot)
            
            # Store SVD model for potential reuse
            self.svd_models[col] = svd
            
            # Add SVD components
            for i in range(reduced.shape[1]):
                feature_name = f'{col}_emb{i}'
                df[feature_name] = reduced[:, i]
                encoded_features.append(feature_name)
        else:
            # If not many categories, just use one-hot
            for c in one_hot.columns:
                df[c] = one_hot[c].values
                encoded_features.append(c)
        
        # Store mapping
        self.feature_mapping[col] = encoded_features
        
        # Drop original column
        df.drop(columns=[col], inplace=True)
        
        return df
    
    def _encode_low_cardinality(self, df: pd.DataFrame, cols: List[str]) -> pd.DataFrame:
        """Encode low cardinality columns with one-hot encoding"""
        # Fill NaN before encoding
        for col in cols:
            df[col].fillna('MISSING', inplace=True)
        
        ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
        ohe_fit = ohe.fit_transform(df[cols])
        
        # Create column names
        ohe_cols = ohe.get_feature_names_out(cols)
        
        # Track mapping for each original column
        for col in cols:
            col_encoded = [c for c in ohe_cols if c.startswith(f"{col}_")]
            self.feature_mapping[col] = col_encoded
        
        # Create DataFrame and concat
        ohe_df = pd.DataFrame(ohe_fit, columns=ohe_cols, index=df.index)
        df = pd.concat([df.drop(columns=cols), ohe_df], axis=1)
        
        # Store encoder for potential reuse
        self.encoders['low_card_ohe'] = ohe
        
        return df

# ==================== CONDITIONAL AUTOENCODER ====================
class ConditionalAutoencoder:
    """Conditional Autoencoder for global anomaly detection"""
    
    def __init__(self, config: Config):
        self.config = config
        self.model = None
        self.encoder = None
        self.history = None
        
    def build_model(self, input_dim: int, conditional_dim: int,
                   latent_dim: int = 16, hidden_dim: int = 64,
                   learning_rate: float = 1e-3) -> Tuple[Model, Model]:
        """Build CAE with improved architecture for stable training"""
        # Input layers
        main_input = Input(shape=(input_dim,), name='main_input')
        conditional_input = Input(shape=(conditional_dim,), name='conditional_input')

        # Encoder with batch normalization and proper activation
        encoder = Dense(hidden_dim, activation='tanh')(main_input)  # tanh works better with MinMaxScaler
        encoder = BatchNormalization()(encoder)
        encoder = Dropout(0.1)(encoder)  # Reduced dropout
        encoder = Dense(hidden_dim // 2, activation='tanh')(encoder)
        encoder = BatchNormalization()(encoder)
        encoder = Dense(latent_dim, activation='tanh')(encoder)

        # Latent space - concatenate with conditional
        latent_space = Concatenate()([encoder, conditional_input])

        # Decoder
        decoder = Dense(latent_dim, activation='tanh')(latent_space)
        decoder = BatchNormalization()(decoder)
        decoder = Dense(hidden_dim // 2, activation='tanh')(decoder)
        decoder = BatchNormalization()(decoder)
        decoder = Dense(hidden_dim, activation='tanh')(decoder)
        decoder_output = Dense(input_dim, activation='sigmoid')(decoder)  # sigmoid for [0,1] output

        # Compile models with better optimizer settings
        autoencoder = Model(inputs=[main_input, conditional_input], outputs=decoder_output)
        autoencoder.compile(
            optimizer=Adam(learning_rate=learning_rate, clipnorm=1.0),  # Add gradient clipping
            loss='mse',  # MSE often works better than MAE for autoencoders
            metrics=['mae']
        )

        encoder_model = Model(inputs=[main_input, conditional_input], outputs=latent_space)

        return autoencoder, encoder_model
    
    def tune_hyperparameters(self, X_main: np.ndarray, X_cond: np.ndarray,
                            param_grid: Optional[Dict] = None) -> Dict:
        """Tune CAE hyperparameters with early stopping"""
        if param_grid is None:
            param_grid = {
                'latent_dim': [8, 16],  # Reduced for faster tuning
                'hidden_dim': [32, 64],  # Reduced for faster tuning
                'learning_rate': [1e-3, 5e-4]  # Reduced for faster tuning
            }
        
        grid = ParameterGrid(param_grid)
        best_params = {}
        min_val_loss = float('inf')
        
        # Split for validation
        X_train, X_val, C_train, C_val = train_test_split(
            X_main, X_cond, test_size=0.2, random_state=self.config.random_state
        )
        
        logger.info(f"Testing {len(list(grid))} CAE parameter combinations...")
        
        for params in grid:
            try:
                logger.debug(f"Testing params: {params}")
                
                # Build and train model
                cae, _ = self.build_model(X_main.shape[1], X_cond.shape[1], **params)
                
                # Callbacks
                callbacks = [
                    EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True),
                    ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6)
                ]
                
                history = cae.fit(
                    [X_train, C_train], X_train,
                    validation_data=([X_val, C_val], X_val),
                    epochs=15,  # Further reduced for faster tuning
                    batch_size=self.config.cae_batch_size,
                    verbose=0,
                    callbacks=callbacks
                )
                
                val_loss = min(history.history['val_loss'])
                
                if val_loss < min_val_loss:
                    min_val_loss = val_loss
                    best_params = params
                    
                # Clean up to free memory
                del cae
                tf.keras.backend.clear_session()
                
            except Exception as e:
                logger.warning(f"Failed to test params {params}: {e}")
                continue
        
        logger.info(f"Best CAE params: {best_params} (Val Loss: {min_val_loss:.4f})")
        return best_params
    
    def train(self, X_main: np.ndarray, X_cond: np.ndarray, 
             params: Optional[Dict] = None) -> Tuple[Model, Model]:
        """Train the final CAE model"""
        if params is None:
            params = self.tune_hyperparameters(X_main, X_cond)
        
        logger.info("Training final CAE model...")
        
        self.model, self.encoder = self.build_model(
            X_main.shape[1], X_cond.shape[1], **params
        )
        
        # Split for validation to prevent overfitting
        X_train, X_val, C_train, C_val = train_test_split(
            X_main, X_cond, test_size=0.2, random_state=self.config.random_state
        )

        callbacks = [
            EarlyStopping(monitor='val_loss', patience=self.config.cae_patience, restore_best_weights=True),
            ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6)
        ]

        self.history = self.model.fit(
            [X_train, C_train], X_train,
            validation_data=([X_val, C_val], X_val),
            epochs=self.config.cae_epochs,
            batch_size=self.config.cae_batch_size,
            verbose=1,
            callbacks=callbacks
        )
        
        return self.model, self.encoder
    
    def compute_anomaly_scores(self, X_main: np.ndarray, X_cond: np.ndarray) -> np.ndarray:
        """Compute reconstruction-based anomaly scores using ECDF"""
        X_pred = self.model.predict([X_main, X_cond], verbose=0)

        # Use MSE for reconstruction error (more sensitive to outliers)
        mse = np.mean((X_main - X_pred) ** 2, axis=1)

        # Use ECDF instead of percentile normalization to avoid saturation
        sorted_mse = np.sort(mse)
        ecdf = np.searchsorted(sorted_mse, mse, side="right") / len(mse)
        scores = ecdf  # in [0,1], monotonic in mse

        logger.info(f"CAE reconstruction scores (ECDF) - Mean: {scores.mean():.3f}, Std: {scores.std():.3f}")

        return scores

# ==================== LOCAL ANOMALY DETECTION ====================
class LocalAnomalyDetector:
    """Ensemble of local anomaly detectors"""
    
    def __init__(self, config: Config):
        self.config = config
        self.weights = {'if': 0.35, 'ocsvm': 0.35, 'lof': 0.30}
        
    def compute_detector_scores(self, X: np.ndarray) -> Dict[str, np.ndarray]:
        """Run multiple anomaly detectors and return normalized scores"""
        scores = {}
        n_samples = X.shape[0]
        
        # Isolation Forest
        try:
            if_model = IsolationForest(
                n_estimators=200,
                max_samples=min(256, n_samples),
                contamination='auto',
                random_state=self.config.random_state,
                n_jobs=-1
            )
            if_model.fit(X)
            if_scores = if_model.decision_function(X)
            # Normalize: lower scores = more anomalous, so invert
            scores['if'] = 1.0 - MinMaxScaler().fit_transform(if_scores.reshape(-1, 1)).flatten()
        except Exception as e:
            logger.warning(f"Isolation Forest failed: {e}")
            scores['if'] = np.zeros(n_samples)
        
        # One-Class SVM with contamination-based nu
        try:
            # FIX: Cap nu at contamination level
            nu_value = min(self.config.local_contamination, max(0.01, n_samples / 10000))
            ocsvm_model = OneClassSVM(
                kernel='rbf',
                gamma='scale',
                nu=nu_value,
                max_iter=1000
            )
            ocsvm_model.fit(X)
            ocsvm_scores = ocsvm_model.decision_function(X)
            scores['ocsvm'] = 1.0 - MinMaxScaler().fit_transform(ocsvm_scores.reshape(-1, 1)).flatten()
        except Exception as e:
            logger.warning(f"One-Class SVM failed: {e}")
            scores['ocsvm'] = np.zeros(n_samples)
        
        # Local Outlier Factor with improved neighbor selection
        try:
            # FIX: Better neighbor selection for LOF
            n_neighbors = min(50, max(10, int(np.sqrt(n_samples))))
            lof = LocalOutlierFactor(
                n_neighbors=n_neighbors,
                contamination='auto',
                novelty=False,
                n_jobs=-1
            )
            lof.fit_predict(X)
            lof_scores = lof.negative_outlier_factor_
            # LOF: more negative = more anomalous
            scores['lof'] = MinMaxScaler().fit_transform((-lof_scores).reshape(-1, 1)).flatten()
        except Exception as e:
            logger.warning(f"LOF failed: {e}")
            scores['lof'] = np.zeros(n_samples)
        
        return scores
    
    def ensemble_scores(self, scores_dict: Dict[str, np.ndarray]) -> np.ndarray:
        """Combine multiple detector scores with weighted average"""
        if not scores_dict:
            return np.zeros(0)
        
        # Ensure we have valid scores
        valid_scores = []
        valid_weights = []
        
        for detector, weight in self.weights.items():
            if detector in scores_dict and scores_dict[detector].sum() > 0:
                valid_scores.append(scores_dict[detector])
                valid_weights.append(weight)
        
        if not valid_scores:
            # Return first available score or zeros
            return next(iter(scores_dict.values())) if scores_dict else np.zeros(0)
        
        # Normalize weights
        total_weight = sum(valid_weights)
        normalized_weights = [w / total_weight for w in valid_weights]
        
        # Weighted average
        ensemble = np.zeros_like(valid_scores[0])
        for score, weight in zip(valid_scores, normalized_weights):
            ensemble += score * weight
        
        return ensemble

# ==================== CLUSTERING ====================
class ClusteringEngine:
    """HDBSCAN clustering with automatic parameter tuning"""
    
    def __init__(self, config: Config):
        self.config = config
        self.clusterer = None
        
    def cluster_latent_space(self, X_latent: np.ndarray) -> np.ndarray:
        """Perform HDBSCAN clustering on latent space"""
        logger.info("Clustering with HDBSCAN on latent space...")
        
        # Adjust parameters based on dataset size
        n_samples = X_latent.shape[0]
        min_cluster_size = min(self.config.min_cluster_size, max(10, n_samples // 100))
        min_samples = min(self.config.min_samples, max(5, n_samples // 200))
        
        self.clusterer = hdbscan.HDBSCAN(
            min_cluster_size=min_cluster_size,
            min_samples=min_samples,
            prediction_data=True,
            core_dist_n_jobs=-1
        )
        
        labels = self.clusterer.fit_predict(X_latent)
        
        n_clusters = len(np.unique(labels[labels != -1]))
        n_noise = (labels == -1).sum()
        
        logger.info(f"HDBSCAN found {n_clusters} clusters and {n_noise} noise points")
        
        return labels

# ==================== ANOMALY DETECTION PIPELINE ====================
class AnomalyDetectionPipeline:
    """Main pipeline orchestrating all detection components"""
    
    def __init__(self, config: Config):
        self.config = config
        self.cae = ConditionalAutoencoder(config)
        self.local_detector = LocalAnomalyDetector(config)
        self.clustering = ClusteringEngine(config)
        
    def detect_anomalies(self, df_original: pd.DataFrame, X_main: np.ndarray, 
                        X_cond: np.ndarray, df_encoded: pd.DataFrame,
                        numeric_cols: List[str]) -> pd.DataFrame:
        """Run complete anomaly detection pipeline"""
        
        # 1. Global Anomaly Detection with CAE
        logger.info("\n=== Phase 1: Global Anomaly Detection ===")
        
        # Tune and train CAE
        best_params = self.cae.tune_hyperparameters(X_main, X_cond)
        self.cae.train(X_main, X_cond, best_params)
        
        # Compute global anomaly scores
        global_scores = self.cae.compute_anomaly_scores(X_main, X_cond)
        
        # Initialize results DataFrame
        results = pd.DataFrame(index=df_original.index)
        results['global_cae_score'] = global_scores

        # Add payment ratio feature for analysis but NOT as a flag
        if 'Paid_amount' in df_original.columns and 'Claim_invoice_gross_total_amount' in df_original.columns:
            results['payment_ratio'] = df_original['Paid_amount'] / df_original['Claim_invoice_gross_total_amount'].replace(0, 1e-6)
            # Log unusual payment ratios for information only
            unusual_payments = ((results['payment_ratio'] > 1.1) | (results['payment_ratio'] < 0.1)).sum()
            if unusual_payments > 0:
                logger.info(f"Note: {unusual_payments} claims have unusual payment ratios")
        
        # 2. Clustering on CAE Latent Space
        logger.info("\n=== Phase 2: Clustering ===")
        X_latent = self.cae.encoder.predict([X_main, X_cond], verbose=0)
        labels = self.clustering.cluster_latent_space(X_latent)
        results['cluster'] = labels
        
        # 3. Local Anomaly Detection
        logger.info("\n=== Phase 3: Local Anomaly Detection ===")
        results['local_ensemble_score'] = 0.0
        
        unique_clusters = np.unique(labels[labels != -1])
        
        for cluster_id in unique_clusters:
            mask = (labels == cluster_id)
            cluster_size = mask.sum()
            
            if cluster_size < 5:  # Reduced minimum cluster size for better coverage
                logger.warning(f"Cluster {cluster_id} too small ({cluster_size}), skipping local detection")
                continue
            
            logger.info(f"Processing cluster {cluster_id} ({cluster_size} samples)")
            
            # Get cluster data
            X_cluster = X_main[mask]
            
            # Run local detectors
            local_scores_dict = self.local_detector.compute_detector_scores(X_cluster)
            local_ensemble = self.local_detector.ensemble_scores(local_scores_dict)
            
            # Assign scores
            results.loc[mask, 'local_ensemble_score'] = local_ensemble
        
        # 4. Final Flagging with EXACT thresholds
        logger.info("\n=== Phase 4: Final Flagging (EXACT thresholds) ===")
        
        # Use exact quantile cutoffs for precise contamination control
        # Global anomalies: exactly top 3%
        qg = np.quantile(results['global_cae_score'], 1 - self.config.global_contamination)
        global_flag = results['global_cae_score'] >= qg
        
        # Local anomalies: exactly top 3% within each cluster
        local_flag = pd.Series(False, index=results.index)
        
        for cluster_id in unique_clusters:
            mask = (labels == cluster_id)
            cluster_size = mask.sum()
            
            if cluster_size > 5:  # Only flag if cluster is large enough
                cluster_scores = results.loc[mask, 'local_ensemble_score']
                if cluster_scores.sum() > 0 and cluster_scores.std() > 0:
                    # Use exact quantile for local contamination
                    ql = np.quantile(cluster_scores, 1 - self.config.local_contamination)
                    cluster_anomalies = cluster_scores >= ql
                    
                    # For tiny clusters, ensure minimum flags
                    min_flags = max(1, int(np.ceil(self.config.local_contamination * cluster_size)))
                    if cluster_anomalies.sum() < min_flags:
                        # Pick top-k by score
                        top_k_idx = cluster_scores.nlargest(min_flags).index
                        local_flag.loc[top_k_idx] = True
                    else:
                        local_flag.loc[cluster_anomalies[cluster_anomalies].index] = True
        
        # Consolidate flags
        conditions = [
            global_flag & local_flag,
            global_flag & ~local_flag,
            ~global_flag & local_flag
        ]
        choices = ['Both', 'Global', 'Local']
        results['Anomaly_Type'] = np.select(conditions, choices, default='Not Anomaly')
        
        # ONLY use Combined Score for final ranking (not Anomaly_Score)
        results['Combined_Score'] = (
            0.6 * results['global_cae_score'] +
            0.4 * results['local_ensemble_score']
        )
        
        results['final_flag'] = (results['Anomaly_Type'] != 'Not Anomaly')
        
        # Combine with original data
        output = pd.concat([
            df_original.reset_index(drop=True),
            results.reset_index(drop=True)
        ], axis=1)
        
        logger.info(f"Total anomalies flagged: {results['final_flag'].sum()}")
        
        return output

# ====================EXPLAINABILITY ENGINE ====================
class ExplainabilityEngine:
    """Generate human-readable explanations for anomalies using z-scores with proper feature mapping"""
    
    def __init__(self, config: Config):
        self.config = config
        
    def _create_reverse_feature_mapping(self, feature_encoder: FeatureEncoder, 
                                      df_original: pd.DataFrame, 
                                      df_encoded: pd.DataFrame) -> Dict[str, str]:
        """Create reverse mapping from encoded features back to original feature names"""
        reverse_mapping = {}
        
        # Direct mapping for features that weren't encoded
        for col in df_original.columns:
            if col in df_encoded.columns:
                reverse_mapping[col] = col
        
        # Mapping for encoded features
        for original_feature, encoded_features in feature_encoder.feature_mapping.items():
            for encoded_feature in encoded_features:
                if encoded_feature in df_encoded.columns:
                    reverse_mapping[encoded_feature] = original_feature
        
        # Handle derived features (interaction features, temporal features, etc.)
        derived_mappings = {
            'Duration': 'Treatment Duration',
            'Claim_Delay': 'Claim Processing Delay',
            'Invoice_DayOfWeek': 'Invoice Day of Week',
            'Invoice_Month': 'Invoice Month', 
            'Invoice_Quarter': 'Invoice Quarter',
            'Invoice_IsWeekend': 'Weekend Invoice Flag',
            'Paid_to_Claimed_Ratio': 'Payment Ratio',
            'Full_Payment_Flag': 'Full Payment Flag',
            'Provider_Payment_Deviation': 'Provider Payment Deviation',
            'Member_Total_Paid': 'Member Total Payments',
            'Member_Provider_Count': 'Member Provider Count'
        }
        
        for encoded_name, display_name in derived_mappings.items():
            if encoded_name in df_encoded.columns:
                reverse_mapping[encoded_name] = display_name
        
        # Handle aggregated features with patterns
        for col in df_encoded.columns:
            if col not in reverse_mapping:
                # Provider aggregation features
                if col.endswith('_mean') and 'Paid_amount' in col:
                    reverse_mapping[col] = 'Provider Average Payment'
                elif col.endswith('_std') and 'Paid_amount' in col:
                    reverse_mapping[col] = 'Provider Payment Variability'
                elif col.endswith('_count') and 'Paid_amount' in col:
                    reverse_mapping[col] = 'Provider Transaction Count'
                elif col.endswith('_nunique') and 'Member_ID' in col:
                    reverse_mapping[col] = 'Provider Unique Members'
                # If still not mapped, use cleaned version of encoded name
                else:
                    # Clean up encoded feature names
                    clean_name = col.replace('_freqenc', '').replace('_log_freq', '').replace('_emb', ' Component')
                    clean_name = clean_name.replace('_', ' ').title()
                    reverse_mapping[col] = clean_name
        
        return reverse_mapping
        
    def generate_explanations(self, df_encoded: pd.DataFrame, out_df: pd.DataFrame,
                             df_original: pd.DataFrame, numeric_cols: List[str],
                             feature_encoder: FeatureEncoder,
                             top_n: int = None) -> Tuple[Dict[int, str], Dict[int, str], Dict[str, str], str]:
        """Generate z-score based explanations for ALL anomalies with proper feature name mapping"""
        # Get ALL anomalies
        all_anomalies = out_df[out_df['final_flag']].copy()
        
        if all_anomalies.empty:
            logger.warning("No anomalies to explain")
            return {}, {}, {}, ""
        
        logger.info(f"Generating explanations for {len(all_anomalies)} anomalies...")

        # Create reverse feature mapping
        reverse_mapping = self._create_reverse_feature_mapping(feature_encoder, df_original, df_encoded)
        lookup_df = self._create_lookup_df(df_original, df_encoded)

        # Generate concise explanations
        global_explanations = {}
        local_explanations = {}
        feature_details = {} # New dictionary to store claims and scores for each feature
        
        for idx in all_anomalies.index:
            anomaly = all_anomalies.loc[idx]
            
            global_exp, local_exp, global_features, local_features = self._generate_zscore_explanations(
                idx, anomaly, df_encoded, numeric_cols, lookup_df,
                df_original, out_df, feature_encoder, reverse_mapping
            )
            
            global_explanations[idx] = global_exp
            local_explanations[idx] = local_exp
            
            # Store detailed info for each feature
            for feature in set(global_features + local_features):
                if feature not in feature_details:
                    feature_details[feature] = []
                feature_details[feature].append({
                    'claim_id': anomaly.get('Claim_ID', idx),
                    'score': anomaly['Combined_Score']
                })
        
        # Generate root cause analysis
        root_cause_analysis = self._generate_root_cause_analysis(
            feature_details, len(all_anomalies)
        )
        
        logger.info(f"Generated explanations for {len(all_anomalies)} anomalies")
        
        return global_explanations, local_explanations, feature_details, root_cause_analysis
    
    def _generate_zscore_explanations(self, idx: int, anomaly: pd.Series,
                                     df_encoded: pd.DataFrame, numeric_cols: List[str],
                                     lookup_df: pd.DataFrame, df_original: pd.DataFrame,
                                     out_df: pd.DataFrame,
                                     feature_encoder: FeatureEncoder,
                                     reverse_mapping: Dict[str, str]) -> Tuple[str, str, List[str], List[str]]:
        """Generate z-score based explanations with proper feature name mapping"""
        global_exp = ""
        local_exp = ""
        top_global_features = []
        top_local_features = []
        
        # Global explanation - show score and top 2 features with z-scores
        if 'Global' in anomaly['Anomaly_Type'] or 'Both' in anomaly['Anomaly_Type']:
            top_global_features = self._get_top_global_features_zscore(
                idx, df_encoded, numeric_cols, df_original, feature_encoder, reverse_mapping
            )
            features_str = ", ".join([f"{feat}: {z:.2f}" for feat, z in top_global_features[:2]])
            global_exp = f"{anomaly['global_cae_score']:.3f} ({features_str})"
        
        # Local explanation - show score and top 2 features with z-scores
        if 'Local' in anomaly['Anomaly_Type'] or 'Both' in anomaly['Anomaly_Type']:
            top_local_features = self._get_top_local_features_zscore(
                idx, int(anomaly['cluster']), out_df, lookup_df,
                numeric_cols, feature_encoder, reverse_mapping
            )
            features_str = ", ".join([f"{feat}: {z:.2f}" for feat, z in top_local_features[:2]])
            local_exp = f"{anomaly['local_ensemble_score']:.3f} ({features_str})"
        
        return global_exp, local_exp, [f[0] for f in top_global_features], [f[0] for f in top_local_features]
    
    def _get_top_global_features_zscore(self, idx: int, df_encoded: pd.DataFrame,
                                       numeric_cols: List[str], df_original: pd.DataFrame,
                                       feature_encoder: FeatureEncoder,
                                       reverse_mapping: Dict[str, str]) -> List[Tuple[str, float]]:
        """Get top features based on z-scores for global anomaly detection with proper mapping"""
        # Calculate global statistics for all numeric features
        global_means = df_encoded[numeric_cols].mean()
        global_stds = df_encoded[numeric_cols].std()
        
        # Get data for this anomaly
        anomaly_data = df_encoded.loc[idx, numeric_cols]
        
        # Calculate z-scores
        z_scores = ((anomaly_data - global_means) / global_stds.replace(0, 1)).abs()
        
        # Map encoded features back to original features and aggregate z-scores
        original_feature_zscores = {}
        
        for encoded_feature, z_score in z_scores.items():
            if pd.isna(z_score):
                continue
                
            # Map to original feature name
            original_feature = reverse_mapping.get(encoded_feature, encoded_feature)
            
            # If this original feature already has a z-score, take the maximum (most extreme)
            if original_feature in original_feature_zscores:
                original_feature_zscores[original_feature] = max(
                    original_feature_zscores[original_feature], z_score
                )
            else:
                original_feature_zscores[original_feature] = z_score
        
        # Sort by z-score and return top features with their scores
        sorted_features = sorted(original_feature_zscores.items(), key=lambda x: x[1], reverse=True)
        return [(feat, zscore) for feat, zscore in sorted_features[:3] if not pd.isna(zscore)]
    
    def _get_top_local_features_zscore(self, idx: int, cluster_id: int, out_df: pd.DataFrame,
                                      lookup_df: pd.DataFrame, numeric_cols: List[str],
                                      feature_encoder: FeatureEncoder,
                                      reverse_mapping: Dict[str, str]) -> List[Tuple[str, float]]:
        """Get top features based on z-scores for local anomaly detection with proper mapping"""
        # Get peer data
        peer_mask = (out_df['cluster'] == cluster_id) & (out_df.index != idx)
        
        if peer_mask.sum() == 0:
            return []
        
        # Calculate z-scores for all numeric columns
        numeric_data = lookup_df[numeric_cols].apply(pd.to_numeric, errors='coerce')
        peer_data = numeric_data.loc[peer_mask]
        anomaly_data = numeric_data.loc[idx]
        
        # Calculate z-scores
        peer_means = peer_data.mean()
        peer_stds = peer_data.std()
        z_scores = ((anomaly_data - peer_means) / peer_stds.replace(0, 1)).abs()
        
        # Map encoded features back to original features and aggregate z-scores
        original_feature_zscores = {}
        
        for encoded_feature, z_score in z_scores.items():
            if pd.isna(z_score):
                continue
                
            # Map to original feature name
            original_feature = reverse_mapping.get(encoded_feature, encoded_feature)
            
            # If this original feature already has a z-score, take the maximum (most extreme)
            if original_feature in original_feature_zscores:
                original_feature_zscores[original_feature] = max(
                    original_feature_zscores[original_feature], z_score
                )
            else:
                original_feature_zscores[original_feature] = z_score
        
        # Sort by z-score and return top features with their scores
        sorted_features = sorted(original_feature_zscores.items(), key=lambda x: x[1], reverse=True)
        return [(feat, zscore) for feat, zscore in sorted_features[:3] if not pd.isna(zscore)]
    
    def _create_lookup_df(self, df_original: pd.DataFrame, df_encoded: pd.DataFrame) -> pd.DataFrame:
        """Create unified lookup DataFrame"""
        lookup_df = pd.concat([
            df_original.reset_index(drop=True),
            df_encoded.reset_index(drop=True)
        ], axis=1)

        # Remove duplicate columns
        lookup_df = lookup_df.loc[:, ~lookup_df.columns.duplicated()].copy()

        return lookup_df
    
    def _generate_root_cause_analysis(self, feature_details: Dict[str, List],
                                    total_anomalies: int) -> str:
        """Generate a concise, business-focused executive summary."""
        
        top_driver = "multiple areas"
        if feature_details:
            # Find the feature associated with the most claims
            sorted_features = sorted(feature_details.items(), key=lambda item: len(item[1]), reverse=True)
            top_driver = sorted_features[0][0]
            top_driver = top_driver.replace('_', ' ').title()

        # Build the 3-point summary
        analysis = (
            f"1. AI analysis has identified {total_anomalies} suspicious claims requiring review, "
            f"highlighting a significant opportunity for cost savings and risk mitigation.\n\n"
            f"2. The primary driver of these anomalies appears to be '{top_driver}'. "
            f"This suggests a pattern of either systemic billing issues or targeted fraudulent activity in this area.\n\n"
            f"3. Recommendation: Immediately assign the high-priority cases for investigation, "
            f"focusing on the '{top_driver}' pattern to quickly address the largest area of financial and compliance risk."
        )
        
        return analysis

def export_model_artifacts(job_id, model, feature_encoder, scalers, base_path="ML Layer/exported_models"):
    """Saves all model components for a given job ID."""
    try:
        export_path = os.path.join(base_path, job_id)
        os.makedirs(export_path, exist_ok=True)
        logger.info(f"Exporting model artifacts to {export_path}")

        # 1. Save Keras Autoencoder
        model_path = os.path.join(export_path, "autoencoder_model")
        model.export(model_path)
        logger.info(f"Saved Keras model to {model_path}")

        # 2. Save Feature Encoder
        fe_path = os.path.join(export_path, "feature_encoder.joblib")
        joblib.dump(feature_encoder, fe_path)
        logger.info(f"Saved feature encoder to {fe_path}")

        # 3. Save Scalers
        scalers_path = os.path.join(export_path, "scalers.joblib")
        joblib.dump(scalers, scalers_path)
        logger.info(f"Saved scalers to {scalers_path}")

        logger.info(f"Successfully exported all artifacts for job {job_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to export model artifacts for job {job_id}: {e}", exc_info=True)
        return False


# ==================== MAIN PIPELINE ====================
def run_pipeline():
    """Main execution pipeline"""
    try:
        # Initialize components
        logger.info("Initializing Healthcare Fraud Detection Pipeline")
        logger.info("=" * 60)
        
        data_processor = DataProcessor(config)
        feature_encoder = FeatureEncoder(config)
        pipeline = AnomalyDetectionPipeline(config)
        explainer = ExplainabilityEngine(config)
        
        # Load and prepare data
        logger.info("\n=== Data Loading and Preparation ===")
        df = data_processor.load_and_clean(config.input_path)
        logger.info(f"Loaded {len(df)} records with {df.shape[1]} features")
        
        # Feature engineering
        df = data_processor.create_interaction_features(df)
        logger.info(f"After feature engineering: {df.shape[1]} features")
        
        # Encode categoricals
        df_encoded = feature_encoder.encode_categoricals(df)
        logger.info(f"After encoding: {df_encoded.shape[1]} features")
        
        # Prepare data for CAE
        # Identify conditional features (provider type, country, etc.)
        conditional_patterns = ['Procedure_code','Treatment_Country', 'Provider_country']
        conditional_cols = [
            c for c in df_encoded.columns 
            if any(p in c for p in conditional_patterns)
        ]
        
        # Main features (everything else that's numeric)
        main_cols = [
            c for c in df_encoded.columns 
            if c not in conditional_cols
        ]
        
        # Get numeric columns only
        numeric_main_cols = df_encoded[main_cols].select_dtypes(include=np.number).columns.tolist()
        numeric_cond_cols = df_encoded[conditional_cols].select_dtypes(include=np.number).columns.tolist()
        
        if not numeric_main_cols:
            raise ValueError("No numeric main features found after encoding")
        
        logger.info(f"Main features: {len(numeric_main_cols)}, Conditional features: {len(numeric_cond_cols)}")
        
        # Scale data with MinMaxScaler for neural network stability
        logger.info("\n=== Data Scaling ===")

        # Use MinMaxScaler for neural networks (better than RobustScaler for deep learning)
        scaler = MinMaxScaler(feature_range=(0, 1))
        X_main = scaler.fit_transform(df_encoded[numeric_main_cols])

        # Handle conditional features with proper scaling
        if numeric_cond_cols:
            cond_scaler = MinMaxScaler(feature_range=(0, 1))
            X_cond = cond_scaler.fit_transform(df_encoded[numeric_cond_cols])
        else:
            # If no conditional features, use a dummy
            X_cond = np.zeros((len(df_encoded), 1))

        # Verify scaled data ranges
        logger.info(f"Main features range: [{X_main.min():.3f}, {X_main.max():.3f}]")
        logger.info(f"Conditional features range: [{X_cond.min():.3f}, {X_cond.max():.3f}]")
        
        logger.info(f"Data shape - Main: {X_main.shape}, Conditional: {X_cond.shape}")
        
        # Run anomaly detection
        out_df = pipeline.detect_anomalies(df, X_main, X_cond, df_encoded, numeric_main_cols)
        
        # Generate explanations with z-scores
        logger.info("\n=== Generating Z-Score Based Explanations ===")
        global_explanations, local_explanations, _, root_cause_analysis = explainer.generate_explanations(
            df_encoded, out_df, df, numeric_main_cols,
            feature_encoder,  # Pass the encoder to access feature mapping
            top_n=None  # Generate for ALL anomalies
        )

        # Print root cause analysis
        if root_cause_analysis:
            print(root_cause_analysis)
            logger.info("Generated root cause analysis")
        
        # Save results
        logger.info("\n=== Saving Results ===")
        
        # Save full audit file with all scores
        out_df_all = out_df.copy()
        out_df_all.to_csv(config.output_path_all, index=False, encoding='utf-8')
        logger.info(f"Saved full audit file with all scores to {config.output_path_all}")
        
        # Save flagged anomalies (sorted by Combined_Score ONLY)
        flagged_df = out_df[out_df['final_flag']].copy()
        flagged_df.sort_values('Combined_Score', ascending=False, inplace=True)

        # Add z-score based explanations as columns
        if global_explanations or local_explanations:
            flagged_df['Global_Explanation'] = flagged_df.index.map(
                lambda x: global_explanations.get(x, "")
            )
            flagged_df['Local_Explanation'] = flagged_df.index.map(
                lambda x: local_explanations.get(x, "")
            )
        
        # Save root cause analysis to separate file
        root_cause_file = 'root_cause_analysis.txt'
        if root_cause_analysis:
            with open(root_cause_file, 'w', encoding='utf-8') as f:
                f.write(root_cause_analysis)
            logger.info(f"Saved root cause analysis to {root_cause_file}")
        
        flagged_df.to_csv(config.output_path, index=False, encoding='utf-8')
        logger.info(f"Saved {len(flagged_df)} flagged anomalies to {config.output_path}")
        
        # Print summary statistics
        logger.info("\n=== Summary Statistics ===")
        logger.info(f"Total records processed: {len(df)}")
        logger.info(f"Total anomalies flagged: {len(flagged_df)}")
        logger.info(f"Detection rate: {len(flagged_df)/len(df)*100:.2f}%")
        
        # Breakdown by type
        type_counts = flagged_df['Anomaly_Type'].value_counts()
        logger.info("\nAnomaly breakdown:")
        for anom_type, count in type_counts.items():
            logger.info(f"  {anom_type}: {count} ({count/len(flagged_df)*100:.1f}%)")
        
        logger.info("\nPipeline completed successfully!")

        return out_df, global_explanations, local_explanations
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}", exc_info=True)
        raise

# ==================== WRAPPER FOR API ====================
def run_pipeline_with_config(input_path: str, output_path: str = None) -> Dict:
    """Wrapper function for API integration"""
    # Update config with provided paths
    original_input = config.input_path
    original_output = config.output_path

    config.input_path = input_path
    if output_path:
        config.output_path = output_path

    try:
        # Run the pipeline
        out_df, global_explanations, local_explanations = run_pipeline()

        # Get flagged data
        flagged_data = out_df[out_df['final_flag']].copy()
        flagged_data.sort_values('Combined_Score', ascending=False, inplace=True)

        # Calculate statistics
        total_records = len(out_df)
        total_anomalies = len(flagged_data)
        detection_rate = (total_anomalies / total_records) * 100 if total_records > 0 else 0

        # Breakdown by type
        anomaly_breakdown = flagged_data['Anomaly_Type'].value_counts().to_dict()

        return {
            'total_records': total_records,
            'total_anomalies': total_anomalies,
            'detection_rate': detection_rate,
            'anomaly_breakdown': anomaly_breakdown,
            'flagged_data': flagged_data,
            'full_data': out_df,
            'explanations': {
                'global': global_explanations,
                'local': local_explanations
            },
            'root_cause_analysis': "Analysis completed successfully"
        }

    finally:
        # Restore original config
        config.input_path = original_input
        config.output_path = original_output
        # ==================== ENTRY POINT ====================
if __name__ == '__main__':
    try:
        # Run the pipeline
        results, global_explanations, local_explanations = run_pipeline()

    except KeyboardInterrupt:
        logger.info("\nPipeline interrupted by user")
        sys.exit(1)

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)