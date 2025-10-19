import pandas as pd

class Scenario9Analyzer:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.data = None

    def load_data(self):
        """Load claims dataset"""
        self.data = pd.read_csv(self.file_path)

    def analyze_member_currencies(self):
        """Flag members with >=3 unique currencies"""
        # Group by Member and collect distinct currencies
        member_currency_counts = (
            self.data.groupby('Member_ID')['Claimed_currency_code']
            .apply(lambda x: list(x.unique()))
            .reset_index()
        )
        member_currency_counts['cur_cnt'] = member_currency_counts['Claimed_currency_code'].apply(len)

        # Flag suspicious members
        flagged_members = member_currency_counts[member_currency_counts['cur_cnt'] >= 3]

        # Get all associated claims for those members
        associated_claims = self.data[
            self.data['Member_ID'].isin(flagged_members['Member_ID'])
        ][['Claim_ID', 'Claimed_currency_code']].drop_duplicates()

        return flagged_members, associated_claims

    def save_outliers(self, associated_claims):
        """Save only Claim_IDs to CSV"""
        associated_claims[['Claim_ID']].drop_duplicates().to_csv(
            "Scenario-9_outliers.csv", index=False
        )

    def analyze(self):
        """Run full analysis"""
        self.load_data()
        flagged_members, associated_claims = self.analyze_member_currencies()
        self.save_outliers(associated_claims)

        # Console outputs
        print("Scenario-9 Analysis Complete ✅")
        print("\nFlagged Members (with currencies):")
        print(flagged_members)
        print("\nAssociated Claims:")
        print(associated_claims)
        print(f"\nTotal flagged Claim_IDs: {len(associated_claims[['Claim_ID']].drop_duplicates())}")
        print("Outliers saved to Scenario-9_outliers.csv")

        return flagged_members, associated_claims


# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario9Analyzer(file_path)
    flagged_members, associated_claims = analyzer.analyze()
    
    result = {
        "multi_currency_claims_count": len(associated_claims[['Claim_ID']].drop_duplicates()),
        "claim_ids": associated_claims['Claim_ID'].drop_duplicates().tolist() if not associated_claims.empty else []
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario9Analyzer("synthetic_healthcare_fraud_data.csv")
    analyzer.analyze()