#!/usr/bin/env python3
"""
Test script to verify the new scenarios (5-9) work correctly
"""

import requests
import json
import os
import pandas as pd

# Create a more comprehensive test CSV file with fields needed for new scenarios
test_data = {
    'Claim_ID': ['CLAIM_001', 'CLAIM_002', 'CLAIM_003', 'CLAIM_004', 'CLAIM_005'],
    'Provider_ID': ['PROV_001', 'PROV_002', 'PROV_003', 'PROV_001', 'PROV_004'],
    'Member_ID': ['MEM_001', 'MEM_002', 'MEM_003', 'MEM_001', 'MEM_002'],
    'billed_amount': [10000, 25000, 5000, 15000, 8000],
    'Paid_amount': [8000, 20000, 4500, 12000, 7000],
    'service_date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'],
    'Treatment from date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'],
    'Treatment_to_date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'],
    'Invoice_No_Reference': ['INV001', 'INV002', 'INV003', 'INV001', 'INV004'],  # Duplicate invoice
    'specialisation_code': [3, 4, 2, 3, 4],  # Inpatient/Outpatient codes
    'Treatment_Country': ['US', 'CA', 'UK', 'FR', 'DE'],  # Multiple countries
    'Provider type': ['Hospital', 'Clinic', 'Lab', 'Hospital', 'global'],  # Provider types
    'Claimed_currency_code': ['USD', 'CAD', 'GBP', 'EUR', 'USD']  # Multiple currencies
}

df = pd.DataFrame(test_data)
test_file = 'test_new_scenarios.csv'
df.to_csv(test_file, index=False)

print(f"Created test file: {test_file}")
print("Test data includes:")
print("- Duplicate invoice references (Scenario 5)")
print("- Inpatient/Outpatient codes (Scenario 6)")
print("- Multiple countries per provider (Scenario 7)")
print("- Multiple providers per member (Scenario 8)")
print("- Multiple currencies per member (Scenario 9)")

# Test the API
API_BASE = 'http://localhost:5001/api'

try:
    # Test health endpoint
    print("\n" + "="*50)
    print("Testing health endpoint...")
    response = requests.get(f'{API_BASE}/health')
    print(f"Health check: {response.status_code} - {response.json()}")
    
    # Test upload endpoint
    print("\nTesting upload endpoint...")
    with open(test_file, 'rb') as f:
        files = {'file': f}
        response = requests.post(f'{API_BASE}/upload', files=files)
    print(f"Upload: {response.status_code} - {response.json()}")
    
    # Test analyze endpoint with all scenarios
    print("\nTesting analyze endpoint with all scenarios (1-9)...")
    analyze_data = {
        'scenarios': [1, 2, 3, 4, 5, 6, 7, 8, 9],
        'file_path': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend', 'temp_upload.csv')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    print(f"Analysis: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"\nScenario Results:")
        for scenario_key, scenario_data in result['results'].items():
            print(f"  {scenario_key}: {scenario_data['name']} - {scenario_data['count']} claims")
        
        print(f"\nTotal Claims analyzed: {len(result.get('claimsData', []))}")
        print(f"Total Anomalies found: {len(result.get('anomaliesData', []))}")
        
        # Show breakdown by scenario type
        anomalies_by_type = {}
        for anomaly in result.get('anomaliesData', []):
            anomaly_type = anomaly.get('type', 'Unknown')
            anomalies_by_type[anomaly_type] = anomalies_by_type.get(anomaly_type, 0) + 1
        
        print(f"\nAnomalies by type:")
        for anomaly_type, count in anomalies_by_type.items():
            print(f"  {anomaly_type}: {count}")
            
        # Test individual scenario endpoints
        print(f"\nTesting individual scenario endpoints...")
        for scenario_id in range(5, 10):  # Test new scenarios 5-9
            try:
                response = requests.get(f'{API_BASE}/scenario/{scenario_id}')
                if response.status_code == 200:
                    scenario_result = response.json()
                    print(f"  Scenario {scenario_id}: {scenario_result['name']} - {len(scenario_result.get('results', []))} detailed results")
                else:
                    print(f"  Scenario {scenario_id}: Error {response.status_code}")
            except Exception as e:
                print(f"  Scenario {scenario_id}: Exception - {e}")
                
    else:
        print(f"Analysis failed: {response.text}")

except requests.exceptions.ConnectionError:
    print("Error: Could not connect to API. Make sure the backend server is running on port 5001")
    print("Start the backend with: python start_backend.py")
except Exception as e:
    print(f"Error: {e}")

# Clean up
if os.path.exists(test_file):
    os.remove(test_file)
    print(f"\nCleaned up test file: {test_file}")

print("\n" + "="*50)
print("Test completed!")
print("If all scenarios show counts > 0, the integration is working correctly.")
print("You can now test the full system by:")
print("1. Starting the backend: python start_backend.py")
print("2. Starting the frontend: npm run dev")
print("3. Uploading a CSV file through the web interface")