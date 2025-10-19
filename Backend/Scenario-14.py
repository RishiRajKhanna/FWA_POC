import pandas as pd

class Scenario14Analyzer:
    def __init__(self, file_path, output_file="Scenario-14_outliers.csv"):
        self.file_path = file_path
        self.output_file = output_file
        self.df = None

    def load_and_prepare_data(self):
        """Loads and prepares the data from the CSV file."""
        try:
            self.df = pd.read_csv(self.file_path, low_memory=False)
            # Rename columns for consistency
            self.df.rename(columns={
                'Member ID': 'Member_ID',
                'Treatment from date': 'Treatment_from_date',
                'Diagnostic_code': 'diagnosis_code',
                'Claim ID': 'Claim_ID'
            }, inplace=True)

            # Convert date column and create a 'treatment_day'
            self.df['treatment_day'] = pd.to_datetime(self.df['Treatment_from_date'], errors='coerce').dt.date
            
            # Drop rows where essential data is missing
            self.df.dropna(subset=['Member_ID', 'treatment_day', 'diagnosis_code', 'Claim_ID'], inplace=True)

        except FileNotFoundError:
            print(f"Error: The file '{self.file_path}' was not found.")
            self.df = pd.DataFrame()

    def find_excessive_diagnoses(self):
        """
        Finds members who have been assigned more than 8 diagnosis codes
        in a single day.
        """
        if self.df is None or self.df.empty:
            return pd.DataFrame()

        # Count distinct diagnoses per member-day
        agg_df = (self.df.groupby(['Member_ID', 'treatment_day'])['diagnosis_code']
                     .nunique()
                     .reset_index(name='diagnosis_count'))

        # Identify member-day pairs with more than 8 diagnoses
        flagged_groups = agg_df[agg_df['diagnosis_count'] > 8]

        if flagged_groups.empty:
            return pd.DataFrame()
            
        # Get the original claims for the flagged member-day pairs
        flagged_claims = pd.merge(self.df, flagged_groups[['Member_ID', 'treatment_day']], on=['Member_ID', 'treatment_day'], how='inner')

        # Add a reason for flagging
        flagged_claims['S14_reason'] = '>8 distinct diagnoses in a single day'
        
        return flagged_claims

    def save_claim_ids(self, flagged_claims):
        """Save only Claim_IDs to CSV"""
        if not flagged_claims.empty:
            flagged_claims[['Claim_ID']].drop_duplicates().to_csv(self.output_file, index=False)
            print(f"Flagged Claim_IDs saved to {self.output_file}")
        else:
            print("No flagged claims to save.")

    def run(self):
        """Runs the full analysis for Scenario 14."""
        print("Running Scenario 14: More than 8 Distinct Diagnoses on the Same Day")
        self.load_and_prepare_data()
        flagged_claims = self.find_excessive_diagnoses()
        
        if not flagged_claims.empty:
            num_incidents = len(flagged_claims.groupby(['Member_ID', 'treatment_day']))
            print(f"Found {num_incidents} instances of a member having >8 diagnoses in a single day.")
            print(f"This corresponds to {len(flagged_claims)} individual claim lines.")
            
            # Display a subset of the results
            display_cols = ['Member_ID', 'treatment_day', 'diagnosis_code', 'S14_reason']
            print("\nSample of flagged claims:")
            print(flagged_claims[display_cols].head(10))
            
            # Save Claim_IDs
            self.save_claim_ids(flagged_claims)
        else:
            print("No claims found matching the criteria for this scenario.")

# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    detector = Scenario14Analyzer(file_path)
    detector.run()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-14_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "excessive_diagnoses_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    detector = Scenario14Analyzer(file_path='synthetic_healthcare_fraud_data.csv')
    detector.run()

