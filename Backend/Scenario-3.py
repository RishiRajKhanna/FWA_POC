import pandas as pd
import numpy as np

class CrossCountryFraudDetector:
    def __init__(self, file_path, output_file="Scenario-3_outliers.csv"):
        self.file_path = file_path
        self.output_file = output_file
        self.df = None
        self.original_columns = None

    def load_and_prepare_data(self):
        self.df = pd.read_csv(self.file_path, low_memory=False)
        self.df.rename(columns={
            'Member ID': 'Member_ID',
            'Treatment from date': 'Treatment_from_date',
            'Treatment to date': 'Treatment_to_date',
            'Country_code(Treatment Country)': 'Treatment_Country',
            'diagnosis_code': 'Diagnostic_Code',
            'Claim ID': 'Claim_ID'
        }, inplace=True)
        
        self.df['Treatment_from_date'] = pd.to_datetime(self.df['Treatment_from_date'], errors='coerce')
        self.df['Treatment_to_date'] = pd.to_datetime(self.df['Treatment_to_date'], errors='coerce')
        
        self.df['Treatment_to_date'].fillna(self.df['Treatment_from_date'], inplace=True)
        self.df.dropna(subset=['Treatment_from_date', 'Treatment_to_date', 'Member_ID', 'Treatment_Country', 'Diagnostic_Code'], inplace=True)

    def find_anomalies(self):
        claims_a = self.df[['Member_ID', 'Claim_ID', 'Treatment_from_date', 'Treatment_to_date', 'Treatment_Country', 'Diagnostic_Code']]
        claims_b = claims_a.copy()

        merged = pd.merge(claims_a, claims_b, on='Member_ID', suffixes=['_A', '_B'])

        anomalies = merged[
            (merged['Claim_ID_A'] < merged['Claim_ID_B']) &
            (merged['Treatment_Country_A'] != merged['Treatment_Country_B']) &
            (merged['Diagnostic_Code_A'] != merged['Diagnostic_Code_B']) &
            (merged['Treatment_from_date_A'] <= merged['Treatment_to_date_B']) &
            (merged['Treatment_to_date_A'] >= merged['Treatment_from_date_B'])
        ]

        return anomalies

    def run(self):
        self.load_and_prepare_data()
        anomalies = self.find_anomalies()

        print("\n--- Overlapping Cross-Country, Multi-Diagnosis Anomalies ---")
        if anomalies.empty:
            print("\nNo anomalies found matching the specified criteria.")
        else:
            print(f"\nFound {len(anomalies)} anomalies. Saving Claim IDs to {self.output_file}...")

            # Flatten both claim columns into a single list and remove duplicates
            claim_ids = pd.concat([anomalies['Claim_ID_A'], anomalies['Claim_ID_B']], axis=0).drop_duplicates().reset_index(drop=True)
            claim_ids_df = pd.DataFrame({'Claim_ID': claim_ids})
            claim_ids_df.to_csv(self.output_file, index=False)
            print(f"\nSaved {len(claim_ids_df)} unique Claim IDs to {self.output_file}.")
        return anomalies   # <-- add this line

# ✅ Wrapper for FastAPI
def run(file_path, params=None):
    detector = CrossCountryFraudDetector(file_path)
    anomalies = detector.run()

    # Flatten both Claim_ID_A and Claim_ID_B into unique list
    if anomalies is not None and not anomalies.empty:
        claim_ids = pd.concat([anomalies['Claim_ID_A'], anomalies['Claim_ID_B']], axis=0).drop_duplicates().tolist()
    else:
        claim_ids = []

    result = {
        "anomalies_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    return result
    return result


if __name__ == "__main__":
    detector = CrossCountryFraudDetector(file_path='synthetic_healthcare_fraud_data.csv')
    detector.run()