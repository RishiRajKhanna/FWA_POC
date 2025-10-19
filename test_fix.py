#!/usr/bin/env python3
"""
Test script to verify the fixes work
"""

import requests
import json
import pandas as pd
import os

# Create a simple test CSV file
test_data = {
    'Claim_ID': ['CLM00000001', 'CLM00000002', 'CLM00000003'],
    'Provider_ID': ['PROV_001', 'PROV_002', 'PROV_003'],
    'Member_ID': ['MEM_001', 'MEM_002', 'MEM_003'],
    'billed_amount': [10000, 25000, 5000],
    'Paid_amount': [8000, 20000, 4500],
    'Treatment from date': ['1/1/2024', '1/7/2024', '1/15/2024'],
    'Treatment_to_date': ['1/3/2024', '1/9/2024', '1/17/2024'],
    'Claim_invoice_gross_total_amount': [10000, 25000, 5000],
    'Payee_type': ['P', 'P', 'P'],
    'Incident_count': [1, 1, 1],
    'Benefit_head_code': [1000, 2000, 3000],
    'Provider_country_code': ['US', 'CA', 'US']
}

df = pd.DataFrame(test_data)
test_file = 'test_claims_fix.csv'
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
    print(f"Upload: {response.status_code}")
    if response.status_code == 200:
        upload_result = response.json()
        print(f"Upload successful: {upload_result.get('message')}")
    else:
        print(f"Upload failed: {response.text}")
        exit(1)
    
    # Test analyze endpoint
    print("\nTesting analyze endpoint...")
    analyze_data = {
        'scenarios': [1, 2, 3, 4],
        'file_path': upload_result.get('file_path')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    print(f"Analysis: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ SUCCESS! Analysis completed:")
        print(f"Results: {result['results']}")
        print(f"Claims count: {len(result.get('claimsData', []))}")
        print(f"Anomalies count: {len(result.get('anomaliesData', []))}")
        
        # Show scenario results
        for scenario, data in result['results'].items():
            print(f"  {scenario}: {data['name']} - {data['count']} anomalies found")
        
        # Show first few anomalies
        anomalies = result.get('anomaliesData', [])
        if anomalies:
            print(f"\nFirst few anomalies:")
            for i, anomaly in enumerate(anomalies[:5]):
                print(f"  {i+1}. {anomaly.get('type')} - Claim: {anomaly.get('claim_id')} - {anomaly.get('description')}")
        
        print(f"\n🎉 The system is now working correctly!")
        print(f"You should be able to see results in the frontend dashboard.")
        
    else:
        print(f"❌ Analysis failed: {response.text}")

except requests.exceptions.ConnectionError:
    print("❌ Error: Could not connect to API. Make sure the backend server is running on port 5001")
    print("Run: python3 Backend/api.py")
except Exception as e:
    print(f"❌ Error: {e}")

# Clean up
if os.path.exists(test_file):
    os.remove(test_file)
    print(f"\nCleaned up test file: {test_file}")