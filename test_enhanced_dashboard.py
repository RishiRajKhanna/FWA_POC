#!/usr/bin/env python3
"""
Test script to verify the enhanced dashboard works with scenario breakdown
"""

import requests
import json
import pandas as pd
import os

# Create a test CSV file with more realistic data
test_data = {
    'Claim_ID': [f'CLM{str(i).zfill(8)}' for i in range(1, 21)],
    'Provider_ID': [f'PROV_{i%5 + 1}' for i in range(20)],
    'Member_ID': [f'MEM_{i}' for i in range(1, 21)],
    'billed_amount': [5000 + (i * 1000) for i in range(20)],
    'Paid_amount': [4000 + (i * 800) for i in range(20)],
    'Treatment from date': ['1/1/2024', '1/7/2024', '1/14/2024', '1/21/2024', '1/28/2024'] * 4,
    'Treatment_to_date': ['1/3/2024', '1/9/2024', '1/16/2024', '1/23/2024', '1/30/2024'] * 4,
    'Claim_invoice_gross_total_amount': [5000 + (i * 1000) for i in range(20)],
    'Payee_type': ['P'] * 20,
    'Incident_count': [1] * 20,
    'Benefit_head_code': [1000 + (i % 5) * 100 for i in range(20)],
    'Provider_country_code': ['US', 'CA', 'UK', 'US', 'CA'] * 4
}

df = pd.DataFrame(test_data)
test_file = 'test_enhanced_claims.csv'
df.to_csv(test_file, index=False)

print(f"Created enhanced test file: {test_file}")

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
    print("\nTesting enhanced analyze endpoint...")
    analyze_data = {
        'scenarios': [1, 2, 3, 4],
        'file_path': upload_result.get('file_path')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Analysis successful!")
        
        # Display enhanced results
        print(f"\n📊 ENHANCED DASHBOARD DATA:")
        print(f"=" * 50)
        
        # Summary
        summary = result.get('summary', {})
        print(f"Total Claims Analyzed: {summary.get('total_claims_analyzed', 0)}")
        print(f"Total Anomalies Found: {summary.get('total_anomalies_found', 0)}")
        print(f"Scenarios Run: {summary.get('scenarios_run', 0)}")
        print(f"High Risk Anomalies: {summary.get('high_risk_anomalies', 0)}")
        
        # Scenario Results
        print(f"\n🔍 SCENARIO BREAKDOWN:")
        for scenario, data in result['results'].items():
            print(f"  {scenario}: {data['name']} - {data['count']} anomalies")
        
        # Scenario Metadata
        metadata = result.get('scenarioMetadata', {})
        print(f"\n📋 SCENARIO DETAILS:")
        for scenario, meta in metadata.items():
            if scenario in result['results']:
                count = result['results'][scenario]['count']
                print(f"  {meta['name']}:")
                print(f"    - Method: {meta['method']}")
                print(f"    - Risk Level: {meta['risk_level']}")
                print(f"    - Claims Found: {count}")
                print(f"    - Description: {meta['description']}")
        
        # Anomaly Types
        anomalies = result.get('anomaliesData', [])
        if anomalies:
            print(f"\n🚨 ANOMALY TYPES FOUND:")
            anomaly_types = {}
            for anomaly in anomalies:
                atype = anomaly.get('type', 'Unknown')
                if atype not in anomaly_types:
                    anomaly_types[atype] = []
                anomaly_types[atype].append(anomaly)
            
            for atype, type_anomalies in anomaly_types.items():
                print(f"  {atype}: {len(type_anomalies)} claims")
                avg_risk = sum(a.get('risk_score', 0) for a in type_anomalies) / len(type_anomalies)
                total_amount = sum(a.get('billed_amount', 0) for a in type_anomalies)
                print(f"    - Avg Risk Score: {avg_risk:.1f}")
                print(f"    - Total Amount at Risk: ${total_amount:,.2f}")
        
        print(f"\n🎉 Enhanced dashboard data is ready!")
        print(f"The frontend should now show:")
        print(f"  ✅ Scenario breakdown cards")
        print(f"  ✅ Scenario performance chart") 
        print(f"  ✅ Detailed claims by scenario")
        print(f"  ✅ Enhanced alerts with scenario info")
        print(f"  ✅ Dynamic KPI cards (no hardcoded values)")
        
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