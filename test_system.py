#!/usr/bin/env python3
"""
Simple test script to verify the fraud detection system works end-to-end
"""

import requests
import json
import os
import pandas as pd

# Create a simple test CSV file
test_data = {
    'Claim_ID': ['CLAIM_001', 'CLAIM_002', 'CLAIM_003'],
    'Provider_ID': ['PROV_001', 'PROV_002', 'PROV_003'],
    'Member_ID': ['MEM_001', 'MEM_002', 'MEM_003'],
    'billed_amount': [10000, 25000, 5000],
    'Paid_amount': [8000, 20000, 4500],
    'service_date': ['2024-01-01', '2024-01-07', '2024-01-15']
}

df = pd.DataFrame(test_data)
test_file = 'test_claims.csv'
df.to_csv(test_file, index=False)

print(f"Created test file: {test_file}")

# Test the API
API_BASE = 'http://localhost:5001/api'

try:
    # Test health endpoint
    print("Testing health endpoint...")
    response = requests.get(f'{API_BASE}/health')
    print(f"Health check: {response.status_code} - {response.json()}")
    
    # Test upload endpoint
    print("\nTesting upload endpoint...")
    with open(test_file, 'rb') as f:
        files = {'file': f}
        response = requests.post(f'{API_BASE}/upload', files=files)
    print(f"Upload: {response.status_code} - {response.json()}")
    
    # Test analyze endpoint
    print("\nTesting analyze endpoint...")
    analyze_data = {
        'scenarios': [1, 2, 3, 4],
        'file_path': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend', 'temp_upload.csv')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    print(f"Analysis: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Results: {result['results']}")
        print(f"Claims count: {len(result.get('claimsData', []))}")
        print(f"Anomalies count: {len(result.get('anomaliesData', []))}")
        
        # Show first few anomalies
        anomalies = result.get('anomaliesData', [])
        if anomalies:
            print("\nFirst few anomalies:")
            for i, anomaly in enumerate(anomalies[:3]):
                print(f"  {i+1}. {anomaly.get('type')} - {anomaly.get('description')}")
    else:
        print(f"Analysis failed: {response.text}")

except requests.exceptions.ConnectionError:
    print("Error: Could not connect to API. Make sure the backend server is running on port 5001")
except Exception as e:
    print(f"Error: {e}")

# Clean up
if os.path.exists(test_file):
    os.remove(test_file)
    print(f"\nCleaned up test file: {test_file}")