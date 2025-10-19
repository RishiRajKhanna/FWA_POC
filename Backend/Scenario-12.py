import pandas as pd
import numpy as np

class Scenario12Analyzer:
    def __init__(self, file_path, output_file="Scenario-12_outliers.csv"):
        self.file_path = file_path
        self.output_file = output_file
        self.data = None

    def load_data(self):
        """Loads data from the CSV file."""
        self.data = pd.read_csv(self.file_path)

    def find_adults_with_pediatric_dx(self):
        """Finds claims where an adult has a pediatric diagnosis."""
        if self.data is None:
            self.load_data()

        df = self.data.copy()

        # Column names in dataset
        age_col = "Age" if "Age" in df.columns else "age"
        code_col = "Diagnostic code" if "Diagnostic code" in df.columns else "diagnosis_code"

        # Check for required columns
        required_columns = [age_col, code_col, "Claim_ID"]
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            print(f"Error: Missing required columns: {missing_cols}")
            return pd.DataFrame()

        # Normalize age & code
        df["_age"] = pd.to_numeric(df[age_col], errors="coerce")
        df["_code"] = df[code_col].astype(str).str.strip().str.upper()

        # Extract first 3 digits for ICD-9 like codes
        df["_code3"] = pd.to_numeric(df["_code"].str.extract(r"^(\d{3})")[0], errors="coerce")

        adult = df["_age"] >= 18

        # ICD-9 perinatal 760–779
        icd9_perinatal = (df["_code3"] >= 760) & (df["_code3"] <= 779)

        # ICD-9 child maltreatment 995.5x
        icd9_maltreatment = df["_code"].str.match(r"^995\.5([0-9])?$", na=False)

        # ICD-10 perinatal P00–P96
        icd10_perinatal = df["_code"].str.match(r"^P(0[0-9]|[1-8][0-9]|9[0-6])(\..*)?$", na=False)

        ped_mask = icd9_perinatal | icd9_maltreatment | icd10_perinatal

        # Optional: only include claims with Paid amount >0
        if "Paid amount" in df.columns:
            paid_mask = pd.to_numeric(df["Paid amount"], errors="coerce").fillna(0) != 0
        else:
            paid_mask = True

        # Filter flagged claims
        out = df[adult & ped_mask & paid_mask].copy()

        return out

    def save_claim_ids(self, flagged_claims):
        """Save only Claim_IDs to CSV"""
        if not flagged_claims.empty:
            flagged_claims[["Claim_ID"]].drop_duplicates().to_csv(self.output_file, index=False)
            print(f"Flagged Claim_IDs saved to {self.output_file}")
        else:
            print("No flagged claims found.")

    def analyze(self):
        """Run full Scenario-12 analysis"""
        print("Running Scenario 12: Adult with Pediatric/Neonatal Diagnosis")
        flagged_claims = self.find_adults_with_pediatric_dx()
        self.save_claim_ids(flagged_claims)
        print(f"Total flagged claims: {len(flagged_claims)}")
        return flagged_claims

# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario12Analyzer(file_path)
    flagged_claims = analyzer.analyze()
    
    result = {
        "adult_pediatric_count": len(flagged_claims),
        "claim_ids": flagged_claims["Claim_ID"].tolist() if not flagged_claims.empty else []
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario12Analyzer("synthetic_healthcare_fraud_data.csv")
    analyzer.analyze()
