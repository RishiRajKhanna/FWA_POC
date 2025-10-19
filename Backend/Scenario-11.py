import pandas as pd

class Scenario11Analyzer:
    def __init__(self, file_path, output_file="Scenario-11_outliers.csv"):
        self.file_path = file_path
        self.output_file = output_file
        self.data = None

    def load_data(self):
        """Loads data from the CSV file."""
        self.data = pd.read_csv(self.file_path)

    def find_early_invoices(self):
        """Finds claims where the invoice date is before the treatment date."""
        if self.data is None:
            self.load_data()
        
        d = self.data.copy()
        
        # Required columns for this scenario
        required_columns = ["Claim_invoice_date", "Treatment from date", "Claim_ID"]
        
        # Check for missing columns
        missing_cols = [col for col in required_columns if col not in d.columns]
        if missing_cols:
            print(f"Error: Missing required columns: {missing_cols}")
            return pd.DataFrame()

        # Ensure date columns are in datetime format
        d["Claim_invoice_date"] = pd.to_datetime(d["Claim_invoice_date"], errors="coerce")
        d["Treatment_from_date"] = pd.to_datetime(d["Treatment from date"], errors="coerce")

        # Filter out rows where date conversion failed
        d.dropna(subset=["Claim_invoice_date", "Treatment_from_date"], inplace=True)

        # Calculate the difference in days
        d["delta_days"] = (d["Claim_invoice_date"] - d["Treatment_from_date"]).dt.days

        # Flag claims where invoice date is before treatment date
        flagged_claims = d[d["delta_days"] < 0][["Claim_ID"]].copy()
        
        return flagged_claims

    def analyze(self):
        """Runs the full analysis for Scenario 11."""
        print("Running Scenario 11: Claim invoice date earlier than treatment from date")
        early_invoices = self.find_early_invoices()

        if not early_invoices.empty:
            print(f"Found {len(early_invoices)} flagged claims.")
            # Save only Claim_ID to CSV
            early_invoices.to_csv(self.output_file, index=False)
            print(f"Flagged Claim_IDs saved to {self.output_file}")
        else:
            print("No claims found where the invoice date is earlier than the treatment date.")


# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario11Analyzer(file_path)
    analyzer.analyze()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-11_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "early_invoice_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario11Analyzer("synthetic_healthcare_fraud_data.csv")
    analyzer.analyze()
