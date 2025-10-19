import pandas as pd

class Scenario8Analyzer:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.data = None

    def load_data(self):
        """Load and preprocess claims data"""
        self.data = pd.read_csv(self.file_path)

        # Convert dates
        self.data['Treatment_from_date'] = pd.to_datetime(
            self.data['Treatment from date'], errors='coerce'
        )
        self.data['Treatment_to_date'] = pd.to_datetime(
            self.data['Treatment_to_date'], errors='coerce'
        )

        # Drop invalid
        self.data = self.data.dropna(
            subset=['Treatment_from_date', 'Treatment_to_date']
        )

    def expand_dates(self):
        """Expand treatment spans into daily rows"""
        self.data['Individual_Dates'] = self.data.apply(
            lambda row: pd.date_range(row['Treatment_from_date'], row['Treatment_to_date']),
            axis=1
        )
        self.data = self.data.explode('Individual_Dates')
        self.data.rename(columns={'Individual_Dates': 'Individual_Date'}, inplace=True)

    def filter_overlapping_visits(self):
        """Flag members with >2 providers on the same date"""
        grouped = self.data.groupby(['Member_ID', 'Individual_Date'])
        flagged = grouped.filter(lambda x: x['Provider_ID'].nunique() > 2)

        # Only return unique Claim_IDs
        return flagged[['Claim_ID']].drop_duplicates()

    def save_outliers(self, flagged_claims):
        """Save flagged Claim IDs to CSV"""
        flagged_claims.to_csv("Scenario-8_outliers.csv", index=False)

    def analyze(self):
        """Run full Scenario-8 analysis"""
        self.load_data()
        self.expand_dates()
        flagged_claims = self.filter_overlapping_visits()
        self.save_outliers(flagged_claims)

        print("Scenario-8 Analysis Complete ✅")
        print(f"Flagged Claim IDs: {len(flagged_claims)}")
        print("Outliers saved to Scenario-8_outliers.csv")
        return flagged_claims


# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario8Analyzer(file_path)
    flagged_claims = analyzer.analyze()
    
    result = {
        "overlapping_visits_count": len(flagged_claims),
        "claim_ids": flagged_claims["Claim_ID"].tolist() if not flagged_claims.empty else []
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario8Analyzer("synthetic_healthcare_fraud_data.csv")
    analyzer.analyze()
