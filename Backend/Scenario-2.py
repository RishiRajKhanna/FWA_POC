import pandas as pd
import numpy as np

class ChemoGapDetector:
    def __init__(self, file_path, output_file="Scenario-2_outliers.csv"):
        self.file_path = file_path
        self.output_file = output_file
        self.df = None

    def load_and_prepare_data(self):
        """Loads and prepares the claims data from the CSV file."""
        self.df = pd.read_csv(self.file_path, low_memory=False)
        self.df.rename(columns={
            'Member ID': 'Member_ID',
            'Treatment from date': 'Treatment_from_date',
            'Paid amount': 'Paid_amount',
            'Claim ID': 'Claim_ID',
            'Procedure code': 'Procedure_code'
        }, inplace=True)
        self.df['Procedure_code'] = pd.to_numeric(self.df['Procedure_code'], errors='coerce').astype('Int64')
        self.df['Treatment_from_date'] = pd.to_datetime(self.df['Treatment_from_date'], errors='coerce')

    def find_treatment_gaps(self, min_gap=3, max_gap=13):
        """Identifies chemotherapy claims with specified treatment gaps."""
        if self.df is None:
            self.load_and_prepare_data()

        chemo_df = self.df[self.df['Procedure_code'] == 4030].copy()
        if chemo_df.empty:
            return pd.DataFrame()

        claim_agg = chemo_df.groupby(['Claim_ID', 'Member_ID', 'Treatment_from_date']).agg(
            total_paid_amount=('Paid_amount', 'sum')
        ).reset_index()

        sorted_claims = claim_agg.sort_values(by=['Member_ID', 'Treatment_from_date'])
        sorted_claims['prev_treatment_date'] = sorted_claims.groupby('Member_ID')['Treatment_from_date'].shift(1)
        sorted_claims['prev_claim_id'] = sorted_claims.groupby('Member_ID')['Claim_ID'].shift(1)
        sorted_claims['gap_in_days'] = (sorted_claims['Treatment_from_date'] - sorted_claims['prev_treatment_date']).dt.days

        gap_claims = sorted_claims[
            (sorted_claims['gap_in_days'] >= min_gap) &
            (sorted_claims['gap_in_days'] <= max_gap)
        ]
        return gap_claims

    def run(self, min_gap=3, max_gap=13):
        """Main method to run the entire detection process."""
        self.load_and_prepare_data()
        gap_results = self.find_treatment_gaps(min_gap, max_gap)

        if not gap_results.empty:
            # Save Claim_IDs to CSV
            gap_results[['Claim_ID']].to_csv(self.output_file, index=False)

        return gap_results


# ✅ Wrapper for FastAPI
def run(file_path, params=None):
    params = params or {}
    min_gap = params.get("min_gap", 3)
    max_gap = params.get("max_gap", 13)

    detector = ChemoGapDetector(file_path)
    gap_results = detector.run(min_gap, max_gap)   # <-- FIXED: positional args

    result = {
        "gaps_count": len(gap_results),
        "claim_ids": gap_results["Claim_ID"].drop_duplicates().tolist() if not gap_results.empty else []
    }
    return result


if __name__ == "__main__":
    print(run("synthetic_healthcare_fraud_data.csv"))
