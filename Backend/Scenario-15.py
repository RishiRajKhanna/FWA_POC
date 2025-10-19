import pandas as pd
import sys

class HospitalBenefitValidator:
    """
    Scenario-15: Flags claims where non-hospital provider types used hospital-only benefit codes.
    """
    SCENARIO_NAME = "S15 - Hospital Benefits from Non-Hospital Providers"
    REQUIRED_COLUMNS = [
        "Benefit_head_code", "Provider_type_code", "Claim_ID",
        "Member_ID", "Paid_amount", "Payment_currency_code"
    ]

    def __init__(self, file_path, output_file="Scenario-15_outliers.csv"):
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
            print(f"Error: Missing required columns: {missing_cols}")
            sys.exit(1)

        # Keep only valid rows
        self.df = self.df[
            self.df["Benefit_head_code"].notna() &
            self.df["Provider_type_code"].notna() &
            self.df["Claim_ID"].notna() &
            self.df["Paid_amount"].notna() &
            (self.df["Paid_amount"] != 0)
        ].copy()

        if self.df.empty:
            print("No valid claims to process.")
            return False
        return True

    def find_mismatches(self):
        hospital_codes = ['4000', '2500', '8040', '2010', '8100', '2510', '2000', '2020']
        non_hospital_exclusions = ['HO', 'NE']

        self.df["_benefit_head_code"] = self.df["Benefit_head_code"].astype(str).str.strip()
        self.df["_provider_type_code"] = self.df["Provider_type_code"].astype(str).str.strip()

        mismatches = self.df[
            self.df["_benefit_head_code"].isin(hospital_codes) &
            (~self.df["_provider_type_code"].isin(non_hospital_exclusions))
        ].copy()

        return mismatches

    def process_and_enrich_results(self, mismatches):
        if mismatches.empty:
            return pd.DataFrame()

        mismatches["row_num"] = mismatches.groupby(["Claim_ID"]).cumcount() + 1
        flagged = mismatches[mismatches["row_num"] == 1].drop(columns=["row_num"], errors="ignore").copy()

        benefit_map = {
            '4000': 'Hospital accommodation', '2500': 'Hospital services',
            '8040': 'Hospital procedures', '2010': 'Inpatient care',
            '8100': 'Hospital treatment', '2510': 'Hospital consultation',
            '2000': 'Hospital admission', '2020': 'Hospital discharge'
        }
        flagged["hospital_benefit_type"] = flagged["Benefit_head_code"].astype(str).map(
            lambda x: benefit_map.get(x, f"Hospital benefit ({x})")
        )
        flagged["reason"] = "Non-hospital provider using hospital-only benefit code"

        # Keep only relevant columns
        final_cols = ["Claim_ID", "Member_ID", "Provider_type_code", "Benefit_head_code",
                      "hospital_benefit_type", "Paid_amount", "Payment_currency_code", "reason"]
        flagged = flagged[[col for col in final_cols if col in flagged.columns]]

        # Save only Claim_IDs to CSV for outliers
        flagged[['Claim_ID']].drop_duplicates().to_csv(self.output_file, index=False)
        print(f"\nFlagged Claim_IDs saved to {self.output_file}")

        return flagged

    def run(self):
        if not self.load_and_prepare_data():
            return

        mismatches = self.find_mismatches()
        final_results = self.process_and_enrich_results(mismatches)

        print(f"\n--- {self.SCENARIO_NAME} ---")
        if final_results.empty:
            print("No claims were flagged by this scenario.")
        else:
            print(f"Found {len(final_results)} flagged claims. Sample output:")
            print(final_results.head())

# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    validator = HospitalBenefitValidator(file_path)
    validator.run()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-15_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "hospital_benefit_mismatch_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    validator = HospitalBenefitValidator(file_path='synthetic_healthcare_fraud_data.csv')
    validator.run()
