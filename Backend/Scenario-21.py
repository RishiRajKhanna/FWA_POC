import pandas as pd

class Scenario21Analyzer:
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

    def normalize_columns(self):
        """Normalize column headers for processing with flexible matching."""
        # Create a mapping of found columns to standardized names
        column_mapping = {}
        
        # Member ID variations
        for col in ['Member_ID', 'member_id', 'MemberID']:
            if col in self.data.columns:
                column_mapping[col] = 'member_id'
                break
        
        # Benefit description variations
        for col in ['Benefit_head_descr', 'benefit_head_descr', 'BenefitHeadDescr']:
            if col in self.data.columns:
                column_mapping[col] = 'benefit_head_descr'
                break
        
        # Diagnosis code variations
        for col in ['diagnosis_code', 'Diagnostic code', 'DiagnosisCode']:
            if col in self.data.columns:
                column_mapping[col] = 'diagnosis_code'
                break
        
        # Diagnosis name variations
        for col in ['Diagnostic name', 'diagnosis_name', 'DiagnosisName']:
            if col in self.data.columns:
                column_mapping[col] = 'diagnosis_name'
                break
        
        # Paid amount variations
        for col in ['Paid_amount', 'paid_amount', 'PaidAmount', 'Paid amount']:
            if col in self.data.columns:
                column_mapping[col] = 'paid_amount'
                break
        
        # Claim ID variations
        for col in ['Claim_ID', 'claim_id', 'ClaimID']:
            if col in self.data.columns:
                column_mapping[col] = 'claim_id'
                break
        
        # Procedure description variations
        for col in ['Procedure_descr', 'procedure_descr', 'ProcedureDescr']:
            if col in self.data.columns:
                column_mapping[col] = 'procedure_descr'
                break
        
        # Provider description variations
        for col in ['Provider__descr', 'provider_type_descr', 'ProviderDescr']:
            if col in self.data.columns:
                column_mapping[col] = 'provider_type_descr'
                break
        
        # Apply the mapping
        self.data.rename(columns=column_mapping, inplace=True)

    def clean_paid_amount(self):
        """Convert paid_amount to numeric."""
        self.data['paid_amount'] = pd.to_numeric(self.data['paid_amount'], errors='coerce').fillna(0)

    def filter_and_flag(self):
        """Filter and flag unusual dentistry claims."""
        if self.data is None or self.data.empty:
            return pd.DataFrame()

        # Normalize columns
        self.normalize_columns()
        # Clean paid_amount
        self.clean_paid_amount()

        # Ensure required columns are present
        required_columns = [
            'member_id', 'benefit_head_descr', 'diagnosis_code', 'diagnosis_name',
            'paid_amount', 'claim_id', 'procedure_descr', 'provider_type_descr'
        ]
        missing_cols = [col for col in required_columns if col not in self.data.columns]
        if missing_cols:
            print(f"Error: Missing required columns: {missing_cols}")
            return pd.DataFrame()

        # Useful dentistry ICD codes
        USEFUL_DENT_CODES = {
            "K00","K01","K02","K03","K04","K05","K06","K07","K08","K09","K10","K11","K12","K13","K14",
            "520","521","522","523","524","525","526","527","528","529",
            "Z01.2"  # dental exam
        }

        # Filter dentistry-related claims
        dentistry_claims = self.data[
            self.data['benefit_head_descr'].str.contains("Dentist", case=False, na=False)
        ]
        print(f"Dentistry Claims Count: {len(dentistry_claims)}")

        # Flag claims with non-dental diagnosis codes
        flagged = dentistry_claims[
            ~dentistry_claims['diagnosis_code'].str.startswith(tuple(USEFUL_DENT_CODES), na=False)
        ]

        # Aggregate duplicates
        self.flagged_claims = flagged.groupby(
            ['member_id', 'benefit_head_descr', 'diagnosis_code', 'diagnosis_name', 
             'procedure_descr', 'provider_type_descr'], as_index=False
        ).agg(
            paid_amount=('paid_amount', 'sum'), 
            claim_count=('claim_id', 'count'),
            claim_ids=('claim_id', lambda x: list(x))
        )

    def analyze(self, output_csv="Scenario-21_outliers.csv"):
        """Runs the full analysis and saves Claim_IDs to CSV."""
        print("Running Scenario 21: Unusual Dentistry Claims")
        self.load_data()
        self.filter_and_flag()

        if self.flagged_claims is not None and not self.flagged_claims.empty:
            print(f"Flagged Claims Count: {len(self.flagged_claims)}")
            # Flatten Claim_IDs for CSV
            claim_ids = [cid for sublist in self.flagged_claims['claim_ids'] for cid in sublist]
            claim_ids_df = pd.DataFrame({'Claim_ID': claim_ids})
            claim_ids_df.to_csv(output_csv, index=False)
            print(f"Flagged Claim IDs exported to '{output_csv}'")
            return claim_ids_df
        else:
            print("No claims found matching the criteria for this scenario.")
            return pd.DataFrame()


# Usage
# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario21Analyzer(file_path)
    flagged_claim_ids_df = analyzer.analyze()
    
    result = {
        "unusual_dentistry_count": len(flagged_claim_ids_df),
        "claim_ids": flagged_claim_ids_df["Claim_ID"].tolist() if not flagged_claim_ids_df.empty else []
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario21Analyzer('synthetic_healthcare_fraud_data.csv')
    flagged_claim_ids_df = analyzer.analyze()
