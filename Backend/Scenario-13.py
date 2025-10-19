import pandas as pd

class Scenario13Analyzer:
    def __init__(self, file_path, output_file="Scenario-13_outliers.csv"):
        self.file_path = file_path
        self.output_file = output_file
        self.data = None

    def load_data(self):
        """Loads data from the CSV file."""
        try:
            self.data = pd.read_csv(self.file_path)
        except FileNotFoundError:
            print(f"Error: The file '{self.file_path}' was not found.")
            self.data = pd.DataFrame()

    def find_different_payees_for_same_invoice(self):
        """Flags claims where the same member has claims on the same invoice date with different payee types."""
        if self.data is None or self.data.empty:
            return pd.DataFrame()

        df = self.data.copy()

        # Rename columns to consistent style
        df.rename(columns={
            'Claim ID': 'Claim_ID',
            'Member ID': 'Member_ID',
            'Payee type': 'Payee_type'
        }, inplace=True)

        required_columns = ['Member_ID', 'Claim_invoice_date', 'Payee_type', 'Claim_ID']
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            print(f"Error: Missing required columns: {missing_cols}")
            return pd.DataFrame()

        # Ensure Claim_invoice_date is datetime
        df['Claim_invoice_date'] = pd.to_datetime(df['Claim_invoice_date'], errors='coerce')
        df.dropna(subset=['Claim_invoice_date'], inplace=True)

        # Group and count unique payee types per member per invoice date
        agg_df = df.groupby(['Member_ID', 'Claim_invoice_date'])['Payee_type'].nunique().reset_index()
        multi_payee_groups = agg_df[agg_df['Payee_type'] > 1]

        if multi_payee_groups.empty:
            return pd.DataFrame()

        # Merge to get all flagged claims
        flagged_pairs = multi_payee_groups[['Member_ID', 'Claim_invoice_date']]
        flagged_claims = pd.merge(df, flagged_pairs, on=['Member_ID', 'Claim_invoice_date'], how='inner')
        flagged_claims['S13_reason'] = "Same member/invoice date claimed with different payees"

        return flagged_claims

    def save_claim_ids(self, flagged_claims):
        """Save only Claim_IDs to CSV"""
        if not flagged_claims.empty:
            flagged_claims[['Claim_ID']].drop_duplicates().to_csv(self.output_file, index=False)
            print(f"Flagged Claim_IDs saved to {self.output_file}")
        else:
            print("No flagged claims to save.")

    def analyze(self):
        """Run full analysis for Scenario 13"""
        print("Running Scenario 13: Same Member, Same Invoice Date, Different Payee Type")
        self.load_data()
        flagged_claims = self.find_different_payees_for_same_invoice()
        self.save_claim_ids(flagged_claims)
        print(f"Total flagged claims: {len(flagged_claims)}")
        return flagged_claims

# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario13Analyzer(file_path)
    flagged_claims = analyzer.analyze()
    
    result = {
        "multiple_payee_count": len(flagged_claims),
        "claim_ids": flagged_claims["Claim_ID"].tolist() if not flagged_claims.empty else []
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario13Analyzer('synthetic_healthcare_fraud_data.csv')
    analyzer.analyze()
