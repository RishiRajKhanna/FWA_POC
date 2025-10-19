import pandas as pd

class BenefitOutlierDetector:
    def __init__(self, file_path):
        self.file_path = file_path
        self.df = None

    def load_and_prepare_data(self):
        cols = [
            'Claim_ID', 'Provider_ID', 'Provider_country_code', 'Claimed_currency_code',
            'Claim_invoice_gross_total_amount', 'Payee_type', 'Incident_count',
            'Benefit_head_code', 'Benefit_head_descr', 'Paid_amount', 'Payment_currency_code'
        ]
        self.df = pd.read_csv(self.file_path, usecols=cols, low_memory=False)

        # Keep only relevant rows (remove invalid / unwanted benefit codes)
        self.df = self.df[
            (self.df["Payee_type"] == "P") &
            (self.df["Claim_invoice_gross_total_amount"] < 10000) &
            (self.df["Benefit_head_code"].notnull()) &
            (self.df["Benefit_head_code"] != 9100)
        ].copy()

    def calculate_incident_amounts(self):
        self.df['gross_per_incident'] = (
            self.df["Claim_invoice_gross_total_amount"] /
            self.df["Incident_count"].replace(0, pd.NA)
        )
        self.df.dropna(subset=['gross_per_incident'], inplace=True)

    def find_outliers(self):
    # --- Step 1: Benefit-level thresholds (IQR) ---
        benefit_stats = (
            self.df.groupby("Benefit_head_code")["gross_per_incident"]
            .agg(q1=lambda x: x.quantile(0.25),
                q3=lambda x: x.quantile(0.75))
            .reset_index()
        )
        benefit_stats["iqr_threshold"] = (
            benefit_stats["q3"] + 1.5 * (benefit_stats["q3"] - benefit_stats["q1"])
        )
        # --- Step 2: Provider-level avg (include country code for alignment) ---
        provider_avg = (
            self.df.groupby(["Provider_ID", "Provider_country_code", "Benefit_head_code"])["gross_per_incident"]
            .mean()
            .reset_index()
            .rename(columns={"gross_per_incident": "provider_avg"})
        )
        # --- Step 3: Country-level avg ---
        country_avg = (
            self.df.groupby(["Provider_country_code", "Benefit_head_code"])["gross_per_incident"]
            .mean()
            .reset_index()
            .rename(columns={"gross_per_incident": "country_avg"})
        )

        # --- Step 4: Merge all stats ---
        stats = (
            provider_avg
            .merge(country_avg, on=["Provider_country_code", "Benefit_head_code"])
            .merge(benefit_stats, on="Benefit_head_code")
        )

        # --- Step 5: Merge back to claims and flag outliers ---
        flagged = self.df.merge(
            stats, on=["Provider_ID", "Provider_country_code", "Benefit_head_code"]
        )
        outliers = flagged.query(
            "gross_per_incident > provider_avg or gross_per_incident > country_avg or gross_per_incident > iqr_threshold"
        )
        print(len(outliers), "outliers detected.")
        # --- Step 6: Final selection ---
        return outliers[
            [
                "Claim_ID", "Provider_ID", "Provider_country_code", "Benefit_head_code", "Benefit_head_descr",
                "Claim_invoice_gross_total_amount", "Incident_count", "gross_per_incident",
                "Paid_amount", "Payment_currency_code", "provider_avg", "country_avg", "iqr_threshold"
            ]
        ]


    def run(self):
        self.load_and_prepare_data()
        self.calculate_incident_amounts()
        outliers = self.find_outliers()
        
        print("--- Outlier Detection Results (Scenario-1) ---")
        if outliers.empty:
            print("No outliers detected for Scenario-1.")
        else:
            claim_ids = outliers["Claim_ID"].drop_duplicates()
            print(f"Outlier Claim_IDs for Scenario-1 ({len(claim_ids)} IDs):")
            print(claim_ids.to_list())

            # Save to CSV
            claim_ids.to_csv("Scenario-1_outliers.csv", index=False)
            print("Outlier Claim_IDs saved to Scenario-1_outliers.csv")
        
        return outliers


# ✅ Wrapper for FastAPI
def run(file_path, params=None):
    detector = BenefitOutlierDetector(file_path)
    outliers = detector.run()

    result = {
        "outliers_count": len(outliers),
        "claim_ids": outliers["Claim_ID"].drop_duplicates().tolist()
    }

    # Optionally save results
    outliers.to_csv("Scenario-1_outliers.csv", index=False)

    return result
if __name__ == "__main__":
    detector = BenefitOutlierDetector("synthetic_healthcare_fraud_data.csv")
    detector.run()
