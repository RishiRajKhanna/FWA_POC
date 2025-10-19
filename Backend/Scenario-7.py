import pandas as pd

class Scenario7Analyzer:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.data = None

    def load_data(self):
        """Load claims dataset from CSV"""
        self.data = pd.read_csv(self.file_path)

    def filter_global_entities(self):
        """Remove providers marked as global"""
        self.data = self.data[self.data['Provider type'].str.lower() != 'global']

    def analyze_provider_countries(self):
        """Identify providers with claims in more than 3 distinct countries"""
        provider_country_counts = (
            self.data.groupby('Provider_ID')['Treatment_Country']
            .nunique()
            .reset_index()
            .rename(columns={'Treatment_Country': 'Unique Country Count'})
        )
        flagged_providers = provider_country_counts[
            provider_country_counts['Unique Country Count'] > 3
        ]
        return flagged_providers

    def get_flagged_claims(self, flagged_providers):
        """Return only the Claim_IDs belonging to flagged providers"""
        flagged_claims = self.data.merge(
            flagged_providers[['Provider_ID']], on='Provider_ID', how='inner'
        )
        return flagged_claims[['Claim_ID']].drop_duplicates()

    def save_outliers(self, flagged_claims):
        """Save flagged claim IDs to CSV"""
        flagged_claims.to_csv("Scenario-7_outliers.csv", index=False)

    def analyze(self):
        """Run full analysis"""
        self.load_data()
        self.filter_global_entities()
        flagged_providers = self.analyze_provider_countries()
        flagged_claims = self.get_flagged_claims(flagged_providers)
        self.save_outliers(flagged_claims)

        print("Scenario-7 Analysis Complete ✅")
        print(f"Flagged Providers: {len(flagged_providers)}")
        print(f"Flagged Claim IDs: {len(flagged_claims)}")
        print("Outliers saved to Scenario-7_outliers.csv")


# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario7Analyzer(file_path)
    analyzer.analyze()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-7_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "multi_country_claims_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario7Analyzer("synthetic_healthcare_fraud_data.csv")
    analyzer.analyze()
