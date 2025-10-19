import pandas as pd
import sys

class PaidVeterinaryClaimValidator:
    """
    Scenario-16: Flags paid claims submitted by specific veterinary providers.
    """
    SCENARIO_NAME = "S16 - Paid Claims from Specific Veterinary Providers"
    REQUIRED_COLUMNS = ["Provider_ID", "Paid_amount", "Claim_ID"]

    def __init__(self, file_path, output_file="Scenario-16_outliers.csv"):
        self.file_path = file_path
        self.output_file = output_file
        self.df = None

    def load_and_prepare_data(self):
        try:
            self.df = pd.read_csv(self.file_path, low_memory=False)
        except FileNotFoundError:
            print(f"Error: File not found at '{self.file_path}'")
            sys.exit(1)
        except Exception as e:
            print(f"Error loading CSV: {e}")
            sys.exit(1)

        missing_cols = [col for col in self.REQUIRED_COLUMNS if col not in self.df.columns]
        if missing_cols:
            print(f"Error: Missing required columns in the dataset: {missing_cols}")
            sys.exit(1)

        # Keep only paid claims
        self.df = self.df[self.df["Paid_amount"] > 0].copy()

        if self.df.empty:
            print("No paid claims to process.")
            return False
        
        print(f"Loaded {len(self.df)} paid claims for analysis.")
        return True

    def find_vet_claims(self):
        vet_provider_ids = [112038, 841666]
        self.df["Provider_ID"] = pd.to_numeric(self.df["Provider_ID"], errors='coerce')
        flagged_claims = self.df[self.df["Provider_ID"].isin(vet_provider_ids)].copy()
        print(f"Found {len(flagged_claims)} claims from the specified veterinary providers.")
        return flagged_claims

    def save_outliers(self, flagged_claims):
        if flagged_claims.empty:
            print("No claims to save.")
            return
        # Save only Claim_IDs to CSV
        flagged_claims[['Claim_ID']].drop_duplicates().to_csv(self.output_file, index=False)
        print(f"Flagged Claim_IDs saved to {self.output_file}")

    def run(self):
        if not self.load_and_prepare_data():
            return
        flagged_claims = self.find_vet_claims()
        self.save_outliers(flagged_claims)

# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    validator = PaidVeterinaryClaimValidator(file_path)
    validator.run()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-16_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "veterinary_claims_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    validator = PaidVeterinaryClaimValidator(file_path='synthetic_healthcare_fraud_data.csv')
    validator.run()
