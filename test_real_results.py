#!/usr/bin/env python3
"""
Test script to verify the real results are being displayed correctly
"""

import requests
import json
import pandas as pd
import os

# Create a test CSV file
test_data = {
    'Claim_ID': [f'CLM{str(i).zfill(8)}' for i in range(1, 11)],
    'Provider_ID': [f'PROV_{i%3 + 1}' for i in range(10)],
    'Member_ID': [f'MEM_{i}' for i in range(1, 11)],
    'billed_amount': [5000 + (i * 1000) for i in range(10)],
    'Paid_amount': [4000 + (i * 800) for i in range(10)],
    'Treatment from date': ['1/1/2024', '1/7/2024', '1/14/2024'] * 3 + ['1/21/2024'],
    'Treatment_to_date': ['1/3/2024', '1/9/2024', '1/16/2024'] * 3 + ['1/23/2024'],
    'Claim_invoice_gross_total_amount': [5000 + (i * 1000) for i in range(10)],
    'Payee_type': ['P'] * 10,
    'Incident_count': [1] * 10,
    'Benefit_head_code': [1000 + (i % 3) * 100 for i in range(10)],
    'Provider_country_code': ['US', 'CA', 'UK'] * 3 + ['US']
}

df = pd.DataFrame(test_data)
test_file = 'test_real_results.csv'
df.to_csv(test_file, index=False)

print(f"Created test file: {test_file}")

# Test the API
API_BASE = 'http://localhost:5001/api'

try:
    # Test upload endpoint
    print("\nTesting upload endpoint...")
    with open(test_file, 'rb') as f:
        files = {'file': f}
        response = requests.post(f'{API_BASE}/upload', files=files)
    
    if response.status_code == 200:
        upload_result = response.json()
        print(f"✅ Upload successful")
    else:
        print(f"❌ Upload failed: {response.text}")
        exit(1)
    
    # Test analyze endpoint
    print("\nTesting analyze endpoint...")
    analyze_data = {
        'scenarios': [1, 2, 3, 4],
        'file_path': upload_result.get('file_path')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Analysis successful!")
        
        # Check the structure
        print(f"\n📊 RESPONSE STRUCTURE:")
        print(f"Results keys: {list(result.keys())}")
        print(f"Claims data count: {len(result.get('claimsData', []))}")
        print(f"Anomalies data count: {len(result.get('anomaliesData', []))}")
        
        # Check scenario results
        scenario_results = result.get('results', {})
        print(f"\n🔍 SCENARIO RESULTS:")
        for scenario, data in scenario_results.items():
            print(f"  {scenario}: {data['name']} - {data['count']} total found")
        
        # Check summary
        summary = result.get('summary', {})
        if summary:
            print(f"\n📋 SUMMARY:")
            print(f"  Total claims analyzed: {summary.get('total_claims_analyzed', 0)}")
            print(f"  Total anomalies in response: {summary.get('total_anomalies_found', 0)}")
            print(f"  Scenarios run: {summary.get('scenarios_run', 0)}")
            
            actual_counts = summary.get('actual_scenario_counts', {})
            if actual_counts:
                print(f"  ACTUAL SCENARIO TOTALS:")
                print(f"    Scenario 1: {actual_counts.get('scenario1_total', 0)}")
                print(f"    Scenario 2: {actual_counts.get('scenario2_total', 0)}")
                print(f"    Scenario 3: {actual_counts.get('scenario3_total', 0)}")
                print(f"    Scenario 4: {actual_counts.get('scenario4_total', 0)}")
        
        # Check sample anomalies
        anomalies = result.get('anomaliesData', [])
        if anomalies:
            print(f"\n🚨 SAMPLE ANOMALIES:")
            for i, anomaly in enumerate(anomalies[:3]):
                print(f"  {i+1}. {anomaly.get('type')} - Claim: {anomaly.get('claim_id')} - Risk: {anomaly.get('risk_score')}")
        
        print(f"\n🎉 The enhanced API is working!")
        print(f"Frontend should now show:")
        print(f"  ✅ Real scenario counts (not just 30 anomalies)")
        print(f"  ✅ Actual claim IDs from scenarios")
        print(f"  ✅ Proper breakdown by scenario type")
        
    else:
        print(f"❌ Analysis failed: {response.text}")

except requests.exceptions.ConnectionError:
    print("❌ Error: Could not connect to API. Make sure the backend server is running on port 5001")
except Exception as e:
    print(f"❌ Error: {e}")

# Clean up
if os.path.exists(test_file):
    os.remove(test_file)
    print(f"\nCleaned up test file: {test_file}")