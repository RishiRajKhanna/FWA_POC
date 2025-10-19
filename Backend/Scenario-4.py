import pandas as pd
import logging

class SundayClaimsAnalyzer:
    """
    Analyze healthcare claims that occur on Sundays within the treatment date range.
    Saves all Sunday claim IDs to a CSV.
    """
    
    def __init__(self, data_file: str, output_file: str = "Scenario-4_outliers.csv"):
        self.data_file = data_file
        self.output_file = output_file
        self.df = None
        self.sunday_claims = None
        self._setup_logging()
    
    def _setup_logging(self):
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(__name__)
    
    def load_data(self):
        """Load CSV and parse dates."""
        try:
            self.df = pd.read_csv(self.data_file)
            self.df['Treatment_from_date'] = pd.to_datetime(self.df['Treatment from date'], errors='coerce', dayfirst=True)
            self.df['Treatment_to_date'] = pd.to_datetime(self.df['Treatment_to_date'], errors='coerce', dayfirst=True)
            self.df['Treatment_to_date'].fillna(self.df['Treatment_from_date'], inplace=True)
            self.logger.info(f"Loaded {len(self.df)} claims")
        except Exception as e:
            self.logger.error(f"Error loading CSV: {e}")
            raise
    
    def filter_sunday_claims(self):
        """Filter claims that have any Sunday in the treatment date range."""
        def has_sunday(row):
            date_range = pd.date_range(start=row['Treatment_from_date'], end=row['Treatment_to_date'])
            return any(date.dayofweek == 6 for date in date_range)  # 6 = Sunday

        self.df['is_sunday_claim'] = self.df.apply(has_sunday, axis=1)
        self.sunday_claims = self.df[self.df['is_sunday_claim']].copy()
        self.logger.info(f"Found {len(self.sunday_claims)} claims with Sunday in treatment range")
    
    def save_claim_ids(self):
        """Save all Sunday claim IDs to CSV."""
        self.sunday_claims[['Claim_ID']].to_csv(self.output_file, index=False)
        self.logger.info(f"Saved Sunday claim IDs to {self.output_file}")
    
    def run_analysis(self):
        self.load_data()
        self.filter_sunday_claims()
        self.save_claim_ids()
        print(f"Total Sunday claims: {len(self.sunday_claims)}")
        print("Sample Sunday Claims:")
        print(self.sunday_claims.head()[['Claim_ID', 'Treatment_from_date', 'Treatment_to_date']].to_string())
        
        # Return a dictionary with count and claim IDs
        return {
            'sunday_claims_count': len(self.sunday_claims),
            'claim_ids': self.sunday_claims['Claim_ID'].tolist() if not self.sunday_claims.empty else []
        }

# ✅ Wrapper for FastAPI
def run(file_path, params=None):
    """
    Entry point for FastAPI runner.
    This keeps the same style as other scenarios.
    """
    analyzer = SundayClaimsAnalyzer(file_path)
    result = analyzer.run_analysis()
    return result

# Run analysis
if __name__ == "__main__":
    analyzer = SundayClaimsAnalyzer("synthetic_healthcare_fraud_data.csv")
    analyzer.run_analysis()
