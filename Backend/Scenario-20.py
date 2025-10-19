import pandas as pd

class Scenario20Analyzer:
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
        """Filter dialysis claims and flag those without kidney-related diagnoses."""
        if self.data is None or self.data.empty:
            return pd.DataFrame()

        df = self.data.copy()

        # Find the correct column names with flexible matching
        benefit_col = None
        for col in ['Benefit_head_code', 'benefit_head_code', 'BenefitHeadCode']:
            if col in df.columns:
                benefit_col = col
                break
        
        diagnosis_col = None
        for col in ['diagnosis_code', 'Diagnostic code', 'DiagnosisCode']:
            if col in df.columns:
                diagnosis_col = col
                break
        
        claim_col = None
        for col in ['Claim_ID', 'claim_id', 'ClaimID']:
            if col in df.columns:
                claim_col = col
                break
        
        # Check essential columns
        if not all([benefit_col, diagnosis_col, claim_col]):
            missing = []
            if not benefit_col: missing.append("Benefit_head_code")
            if not diagnosis_col: missing.append("diagnosis_code")
            if not claim_col: missing.append("Claim_ID")
            print(f"Error: Missing essential columns: {missing}")
            return pd.DataFrame()

        # Legitimate diagnosis codes
        legit_codes = {
            "403.00", "403.01", "403.10", "403.11", "403.90", "403.91",
            "404.00", "404.01", "404.02", "404.03", "404.10", "404.11", "404.12", "404.13",
            "404.90", "404.91", "404.92", "404.93",
            "250.40", "250.41", "250.42", "250.43",
            "753.00", "753.01", "753.02", "753.03",
            "788.00", "788.01", "788.02",
            "866.00", "866.01", "866.02", "866.03",
            "189.00", "189.01",
            "599.00", "599.01", "599.02",
            *[str(code) for code in range(580, 594)],  # Range 580–593
            "N17.0", "N17.1", "N17.2", "N17.8", "N17.9",
            "N18.0", "N18.1", "N18.2", "N18.3", "N18.4", "N18.5", "N18.6", "N18.9",
            "N19", "N25.0", "N25.1", "N25.8", "N25.9",
            "Q61.0", "Q61.1", "Q61.2", "Q61.3", "Q61.4", "Q61.5", "Q61.8", "Q61.9",
            "C64.0", "C64.1", "C64.2", "C64.9",
            "I12.0", "I12.9", "I13.0", "I13.1", "I13.2", "I13.9",
            "E08.21", "E09.21", "E10.21", "E11.21", "E13.21",
            "E08.22", "E09.22", "E10.22", "E11.22", "E13.22",
            "E08.29", "E09.29", "E10.29", "E11.29", "E13.29"
        }

        # Convert benefit code to string for comparison
        df[benefit_col] = df[benefit_col].astype(str).str.strip()
        
        # Filter rows where Benefit_head_code = 3660 (dialysis outpatient)
        dialysis_claims = df[df[benefit_col] == '3660']
        print(f"Total dialysis claims found: {len(dialysis_claims)}")

        # Convert diagnosis codes to string for comparison
        dialysis_claims[diagnosis_col] = dialysis_claims[diagnosis_col].astype(str).str.strip()
        
        # Exclude claims with legitimate diagnosis codes
        flagged_claims = dialysis_claims[~dialysis_claims[diagnosis_col].isin(legit_codes)].copy()
        
        # Ensure we have the Claim_ID column for output
        if claim_col != 'Claim_ID':
            flagged_claims['Claim_ID'] = flagged_claims[claim_col]

        self.flagged_claims = flagged_claims

    def analyze(self):
        """Runs the full analysis for Scenario 20 and saves flagged Claim_IDs to CSV."""
        print("Running Scenario 20: Dialysis Without Kidney/Renal Diagnosis")
        self.load_data()
        self.filter_and_flag()

        if self.flagged_claims is not None and not self.flagged_claims.empty:
            # Save unique Claim_IDs to CSV
            self.flagged_claims[['Claim_ID']].drop_duplicates().to_csv('Scenario-20_outliers.csv', index=False)
            print(f"Flagged {len(self.flagged_claims)} claims. Claim_IDs saved to 'Scenario-20_outliers.csv'.")
        else:
            print("No claims found matching the criteria for this scenario.")

# Usage
# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario20Analyzer(file_path)
    analyzer.analyze()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-20_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "dialysis_without_kidney_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario20Analyzer('synthetic_healthcare_fraud_data.csv')
    analyzer.analyze()
