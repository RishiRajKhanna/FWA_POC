import pandas as pd

class Scenario19Analyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.data = None
        self.flagged_claims = None

    def load_data(self):
        """Loads data from the CSV file."""
        try:
            self.data = pd.read_csv(self.file_path)
        except FileNotFoundError:
            print(f"Error: The file '{self.file_path}' was not found.")
            self.data = pd.DataFrame()

    def filter_and_flag(self):
        """Filter claims and flag members with multiple screenings in the same year."""
        if self.data is None or self.data.empty:
            return pd.DataFrame()

        df = self.data.copy()

        # Find the correct column names with flexible matching
        benefit_col = None
        for col in ['Benefit_head_code', 'benefit_head_code', 'BenefitHeadCode']:
            if col in df.columns:
                benefit_col = col
                break
        
        treatment_col = None
        for col in ['Treatment from date', 'Treatment_from_date', 'treatment_from_date', 'service_date']:
            if col in df.columns:
                treatment_col = col
                break
        
        member_col = None
        for col in ['Member_ID', 'member_id', 'MemberID']:
            if col in df.columns:
                member_col = col
                break
        
        claim_col = None
        for col in ['Claim_ID', 'claim_id', 'ClaimID']:
            if col in df.columns:
                claim_col = col
                break
        
        # Check if all required columns are found
        if not all([benefit_col, treatment_col, member_col, claim_col]):
            missing = []
            if not benefit_col: missing.append("Benefit_head_code")
            if not treatment_col: missing.append("Treatment_from_date")
            if not member_col: missing.append("Member_ID")
            if not claim_col: missing.append("Claim_ID")
            print(f"Error: Missing required columns: {missing}")
            return pd.DataFrame()
        
        # Convert benefit code to numeric for comparison
        df[benefit_col] = pd.to_numeric(df[benefit_col], errors='coerce')
        
        # Filter rows where Benefit_head_code = 6500
        df = df[df[benefit_col] == 6500]

        # Extract year from treatment date
        df['Year'] = pd.to_datetime(df[treatment_col], errors='coerce').dt.year

        # Group by Member_ID and Year, and count screenings
        agg = df.groupby([member_col, 'Year'], as_index=False).agg(screening_count=(claim_col, 'count'))

        # Flag members with more than one screening in the same year
        flagged_members = agg[agg['screening_count'] > 1][[member_col, 'Year']]

        # Merge flagged members back with the original data to get Claim_IDs
        self.flagged_claims = df.merge(flagged_members, on=[member_col, 'Year'], how='inner')
        
        # Ensure we have the Claim_ID column for output
        if claim_col != 'Claim_ID':
            self.flagged_claims['Claim_ID'] = self.flagged_claims[claim_col]

    def analyze(self):
        """Runs the full analysis for Scenario 19 and outputs Claim_IDs to CSV."""
        print("Running Scenario 19: Multiple Screenings in the Same Year")
        self.load_data()
        self.filter_and_flag()

        if self.flagged_claims is not None and not self.flagged_claims.empty:
            # Save unique Claim_IDs to CSV
            self.flagged_claims[['Claim_ID']].drop_duplicates().to_csv('Scenario-19_outliers.csv', index=False)
            print(f"Flagged {len(self.flagged_claims)} claims. Claim_IDs saved to 'Scenario-19_outliers.csv'.")
        else:
            print("No claims found matching the criteria for this scenario.")

# Usage
# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario19Analyzer(file_path)
    analyzer.analyze()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-19_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "multiple_screenings_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario19Analyzer('synthetic_healthcare_fraud_data.csv')
    analyzer.analyze()
