import pandas as pd
import logging
from typing import Optional

class MultipleClaimsInvoiceChecker:
    """
    Checks for multiple claims submitted with the same invoice reference number,
    excluding references of a specified length.
    """

    def __init__(self, data_file: str, invoice_length_exclude: int = 0, output_file: str = "Scenario-5_outliers.csv"):
        self.data_file = data_file
        self.invoice_length_exclude = invoice_length_exclude
        self.output_file = output_file
        self.df: Optional[pd.DataFrame] = None
        self.result: Optional[pd.DataFrame] = None
        self._setup_logging()

    def _setup_logging(self):
        logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
        self.logger = logging.getLogger(__name__)

    def load_data(self):
        self.logger.info(f"Loading data from {self.data_file}")
        self.df = pd.read_csv(self.data_file)
        self.logger.info(f"Loaded {len(self.df)} rows")

    def find_invalid_invoices(self):
        invalid_invoices = (
            self.df[self.df["Invoice_No_Reference"].str.len() != self.invoice_length_exclude]
            .groupby(["Member_ID", "Invoice_No_Reference"])
            .agg(unique_claims=("Claim_ID", "nunique"))
            .reset_index()
        )
        return invalid_invoices[invalid_invoices["unique_claims"] > 1]

    def get_duplicate_claims(self, invalid_invoices):
        subquery = self.df.merge(
            invalid_invoices[["Member_ID", "Invoice_No_Reference"]],
            on=["Member_ID", "Invoice_No_Reference"],
            how="inner"
        )
        return subquery[
            subquery["Invoice_No_Reference"].str.len() != self.invoice_length_exclude
        ][["Claim_ID"]].drop_duplicates()

    def run(self):
        self.load_data()
        invalid_invoices = self.find_invalid_invoices()
        result = self.get_duplicate_claims(invalid_invoices)

        # Save only Claim_IDs to file
        result.to_csv(self.output_file, index=False)
        self.logger.info(f"Results saved to {self.output_file}")

        print(result.head())
        print(f"\nCount of duplicate claim invoice: {len(result)}")
        return result


# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    checker = MultipleClaimsInvoiceChecker(file_path)
    result_df = checker.run()
    
    result = {
        "duplicate_claims_count": len(result_df),
        "claim_ids": result_df["Claim_ID"].tolist() if not result_df.empty else []
    }
    
    return result

if __name__ == "__main__":
    checker = MultipleClaimsInvoiceChecker("synthetic_healthcare_fraud_data.csv")
    checker.run()
