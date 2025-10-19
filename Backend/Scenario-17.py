import pandas as pd

MRI_CT_BHE_CODES = {"2570", "2560"}

class Scenario17Analyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.data = None
        self.flagged = None

    def load_data(self):
        """Loads data from the CSV file."""
        try:
            self.data = pd.read_csv(self.file_path)
        except FileNotFoundError:
            print(f"Error: The file '{self.file_path}' was not found.")
            self.data = pd.DataFrame()

    def normalize_and_filter(self):
        """Normalize columns and filter rows for MRI/CT benefit codes."""
        if self.data is None or self.data.empty:
            return pd.DataFrame()

        df = self.data.copy()
        
        # Handle different possible column names for benefit head code
        benefit_col = None
        for col in ['Benefit_head_code', 'benefit_head_code', 'BenefitHeadCode']:
            if col in df.columns:
                benefit_col = col
                break
        
        if benefit_col is None:
            print("Error: No benefit head code column found")
            return pd.DataFrame()
        
        # Handle different possible column names for diagnosis code
        diagnosis_col = None
        for col in ['diagnosis_code', 'Diagnostic code', 'DiagnosisCode']:
            if col in df.columns:
                diagnosis_col = col
                break
        
        if diagnosis_col is None:
            print("Error: No diagnosis code column found")
            return pd.DataFrame()
        
        # Handle different possible column names for treatment date
        treatment_col = None
        for col in ['Treatment from date', 'treatment_from', 'Treatment_from_date']:
            if col in df.columns:
                treatment_col = col
                break
        
        if treatment_col is None:
            print("Error: No treatment date column found")
            return pd.DataFrame()
        
        # Handle different possible column names for member ID
        member_col = None
        for col in ['Member_ID', 'member_id', 'MemberID']:
            if col in df.columns:
                member_col = col
                break
        
        if member_col is None:
            print("Error: No member ID column found")
            return pd.DataFrame()
        
        # Normalize the data using the found column names
        df["benefit_head_code"] = df[benefit_col].astype(str).str.strip().str.upper()
        df["diagnosis_code"] = df[diagnosis_col].astype(str).str.strip().str.upper()
        df["treatment_from"] = pd.to_datetime(df[treatment_col], errors="coerce").dt.date
        df["member_id"] = df[member_col].astype(str).str.strip()

        # Filter rows for valid MRI/CT benefit codes
        mask = df["treatment_from"].notna() & df["diagnosis_code"].ne("") & df["benefit_head_code"].isin(MRI_CT_BHE_CODES)
        return df[mask]

    def flag_multiple_mri_ct(self, filtered_data):
        """Flag members with >= 2 MRI/CT usages on the same day for the same diagnosis."""
        if filtered_data.empty:
            return pd.DataFrame()

        # Group and aggregate
        agg = (
            filtered_data.groupby(["member_id", "treatment_from", "diagnosis_code"], as_index=False)
            .agg(
                bhe_usage_count=("benefit_head_code", "count"),
                bhe_codes=("benefit_head_code", lambda s: sorted({str(x) for x in s if pd.notna(x)}))
            )
        )

        # Flag groups with >= 2 MRI/CT usages
        flagged_groups = agg[agg["bhe_usage_count"] >= 2]
        if flagged_groups.empty:
            return pd.DataFrame()

        # Merge flagged groups back with the original data
        flagged = filtered_data.merge(flagged_groups, on=["member_id", "treatment_from", "diagnosis_code"], how="inner")

        # Add reason for flagging
        flagged["reason"] = flagged.apply(
            lambda row: f"{row['bhe_usage_count']} MRI/CT benefit usages on {row['treatment_from']} for diagnosis {row['diagnosis_code']} (BHE codes: {', '.join(row['bhe_codes'])}).",
            axis=1
        )
        return flagged

    def analyze(self, output_csv="Scenario-17_outliers.csv"):
        """Runs the full analysis and saves flagged Claim_IDs to a CSV."""
        print("Running Scenario 17: Multiple MRI/CT in a Day (>=2 times)")
        self.load_data()
        filtered_data = self.normalize_and_filter()
        self.flagged = self.flag_multiple_mri_ct(filtered_data)

        if not self.flagged.empty:
            print(f"Flagged Rows Count: {len(self.flagged)}")
            # Save only Claim_IDs to CSV
            self.flagged[['Claim_ID']].drop_duplicates().to_csv(output_csv, index=False)
            print(f"Claim_IDs saved to {output_csv}")
        else:
            print("No claims found matching the criteria for this scenario.")

# Usage
# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario17Analyzer(file_path)
    analyzer.analyze()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-17_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "multiple_mri_ct_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario17Analyzer('synthetic_healthcare_fraud_data-2.csv')
    analyzer.analyze()
