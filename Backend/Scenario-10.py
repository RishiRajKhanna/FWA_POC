import pandas as pd

class Scenario10Analyzer:
    def __init__(self, file_path):
        self.file_path = file_path
        self.data = None
        self.female_specific = [
            'M5100','M5220','M5300','M5820','P0320','P0550','P0600','P1300','P2000',
            '2100','2230','2310','2340','P2380','P2420','Q0220','Q0230','Q0330','00740',
            '00750','00800','Q0920','Q1030','Q1700','Q1800','Q2020','Q2230','Q3800',
            '03900','Q4400','R1820', '77067','77065', '19081'
        ]
        self.male_specific = [
            'M6180','M6182','M6530','M6580','M6620','M7020','N0820','N1100','N1340',
            'N1350','N1580','2200','2842','30301'
        ]

    def load_data(self):
        self.data = pd.read_csv(self.file_path)

    def filter_mismatches(self):
        mismatches = self.data[
            ((self.data["Gender"] == "M") & (self.data["Procedure_code"].astype(str).isin(self.female_specific))) |
            ((self.data["Gender"] == "F") & (self.data["Procedure_code"].astype(str).isin(self.male_specific)))
        ]
        print(f"Total mismatches found: {len(mismatches)})")
        return mismatches

    def aggregate_claims(self, mismatches):
        scenario10 = (
            mismatches[mismatches["Age"] > 1]
            .groupby(
                ["Claim_ID","Member_ID","Gender","Procedure_code","Payment_currency_code","Age"],
                as_index=False
            )
            .agg(pd=("Paid_amount","sum"))
        )
        return scenario10

    def group_by_currency(self, scenario10):
        scenario10_final = scenario10.groupby("Payment_currency_code", as_index=False).agg(
            total_paid=("pd","sum")
        )
        return scenario10_final

    def analyze(self):
        self.load_data()
        mismatches = self.filter_mismatches()
        mismatches[['Claim_ID']].to_csv('Scenario-10_outliers.csv', index=False)
        scenario10 = self.aggregate_claims(mismatches)
        scenario10_final = self.group_by_currency(scenario10)
        print("Scenario 10: Procedure Code and Gender Mismatch")
        print(scenario10_final)

# ✅ Wrapper for API integration
def run(file_path, params=None):
    """
    Entry point for API integration.
    Returns standardized result format.
    """
    analyzer = Scenario10Analyzer(file_path)
    analyzer.analyze()
    
    # Get the flagged claims count from the saved file
    try:
        flagged_df = pd.read_csv("Scenario-10_outliers.csv")
        claim_ids = flagged_df["Claim_ID"].tolist()
    except:
        claim_ids = []
    
    result = {
        "gender_mismatch_count": len(claim_ids),
        "claim_ids": claim_ids
    }
    
    return result

if __name__ == "__main__":
    analyzer = Scenario10Analyzer('synthetic_healthcare_fraud_data.csv')
    analyzer.analyze()
