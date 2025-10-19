import pandas as pd

class Scenario6OutlierDetector:
    def __init__(self, file_path):
        self.file_path = file_path
        self.df = None
        self.outliers = None

    def load_and_prepare_data(self):
        """Load claims data and keep required columns."""
        self.df = pd.read_csv(self.file_path, low_memory=False)
        self.df = self.df[['Claim_ID', 'Member_ID', 'specialisation_code', 'Treatment_to_date']]

    def find_outliers(self):
        """Find claims where same member has both inpatient (3) and outpatient (4) on the same date."""
        # Create a grouped view: Member_ID + Date → set of spec codes
        grouped = self.df.groupby(['Member_ID', 'Treatment_to_date'])['specialisation_code'].apply(set).reset_index()

        # Filter groups having both 3 and 4
        conflict_groups = grouped[grouped['specialisation_code'].apply(lambda x: {3, 4}.issubset(x))]

        # Get anomalies from original df
        merged = self.df.merge(conflict_groups[['Member_ID', 'Treatment_to_date']],
                               on=['Member_ID', 'Treatment_to_date'],
                               how='inner')

        self.outliers = merged[['Claim_ID']].drop_duplicates()

    def save_outliers(self, output_file="Scenario-6_outliers.csv"):
        """Save only Claim_IDs of anomalies to CSV."""
        if self.outliers is not None and not self.outliers.empty:
            self.outliers.to_csv(output_file, index=False)
            print(f"Outliers saved to {output_file}")
        else:
            print("No outliers detected.")

# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    detector = Scenario6OutlierDetector(file_path)
    detector.load_and_prepare_data()
    detector.find_outliers()
    detector.save_outliers()
    
    result = {
        "conflict_claims_count": len(detector.outliers) if detector.outliers is not None else 0,
        "claim_ids": detector.outliers["Claim_ID"].tolist() if detector.outliers is not None and not detector.outliers.empty else []
    }
    
    return result

if __name__ == "__main__":
    file_path = "synthetic_healthcare_fraud_data.csv"  
    detector = Scenario6OutlierDetector(file_path)
    detector.load_and_prepare_data()
    detector.find_outliers()
    detector.save_outliers()
