import pandas as pd

def find_invalid_migraine_claims(df: pd.DataFrame) -> pd.DataFrame:
    """
    Identifies claims where the diagnosis is for migraine (ICD-9 '346' or ICD-10 'G43.9') 
    but the benefit head code is not one of the specified valid codes.
    """
    valid_benefit_codes = ['3611', '3670', '3671']

    # Find the correct column names with flexible matching
    diagnosis_col = None
    for col in ['diagnosis_code', 'Diagnostic code', 'DiagnosisCode']:
        if col in df.columns:
            diagnosis_col = col
            break
    
    benefit_col = None
    for col in ['Benefit_head_code', 'benefit_head_code', 'BenefitHeadCode']:
        if col in df.columns:
            benefit_col = col
            break
    
    claim_col = None
    for col in ['Claim_ID', 'claim_id', 'ClaimID']:
        if col in df.columns:
            claim_col = col
            break
    
    # Check if required columns are found
    if not all([diagnosis_col, benefit_col, claim_col]):
        missing = []
        if not diagnosis_col: missing.append("diagnosis_code")
        if not benefit_col: missing.append("Benefit_head_code")
        if not claim_col: missing.append("Claim_ID")
        print(f"Error: Missing required columns: {missing}")
        return pd.DataFrame()

    # Standardize data types
    df[diagnosis_col] = df[diagnosis_col].astype(str).str.strip()
    df[benefit_col] = df[benefit_col].astype(str).str.strip()

    # Filter for migraine diagnoses
    migraine_claims = df[df[diagnosis_col].isin(['346', 'G43.9'])]

    # Find claims where benefit head code is NOT in the valid list
    invalid_claims = migraine_claims[~migraine_claims[benefit_col].isin(valid_benefit_codes)].copy()
    
    # Ensure we have the Claim_ID column for output
    if claim_col != 'Claim_ID':
        invalid_claims['Claim_ID'] = invalid_claims[claim_col]
    
    print(f"Invalid Migraine Claims Count: {len(invalid_claims)}")
    return invalid_claims

# --- Example usage ---
# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    claims_df = pd.read_csv(file_path)
    invalid_migraine_claims = find_invalid_migraine_claims(claims_df)

    if not invalid_migraine_claims.empty:
        print("--- Detected Invalid Migraine Claims ---")
        print(invalid_migraine_claims)

        # Export Claim_IDs to CSV
        invalid_migraine_claims[['Claim_ID']].to_csv('Scenario-22_outliers.csv', index=False)
        claim_ids = invalid_migraine_claims['Claim_ID'].tolist()
    else:
        print("No invalid migraine claims found.")
        claim_ids = []
    
    result = {
        "invalid_migraine_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    claims_df = pd.read_csv("synthetic_healthcare_fraud_data.csv")
    invalid_migraine_claims = find_invalid_migraine_claims(claims_df)

    if not invalid_migraine_claims.empty:
        print("--- Detected Invalid Migraine Claims ---")
        print(invalid_migraine_claims)

        # Export Claim_IDs to CSV
        invalid_migraine_claims[['Claim_ID']].to_csv('Scenario-22_outliers.csv', index=False)
    else:
        print("No invalid migraine claims found.")
