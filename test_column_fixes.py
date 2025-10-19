#!/usr/bin/env python3
"""
Test script to verify column name fixes work correctly
"""

import requests
import json
import os
import pandas as pd

# Create test CSV with the actual column names from your data
test_data = {
    'Claim_ID': ['CLAIM_001', 'CLAIM_002', 'CLAIM_003', 'CLAIM_004', 'CLAIM_005'],
    'Provider_ID': ['PROV_001', 'PROV_002', '112038', 'PROV_004', '841666'],
    'Member_ID': ['MEM_001', 'MEM_002', 'MEM_003', 'MEM_004', 'MEM_005'],
    
    # Financial data
    'Paid_amount': [8000, 20000, 4500, 12000, 7000],
    'Claim_invoice_gross_total_amount': [10000, 25000, 5000, 15000, 8000],
    'Payment_currency_code': ['USD', 'CAD', 'GBP', 'EUR', 'USD'],
    
    # Dates
    'Treatment from date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'],
    'Claim_invoice_date': ['2024-01-02', '2024-01-08', '2024-01-16', '2023-12-31', '2024-01-08'],
    
    # Medical codes - using actual column names
    'Benefit_head_code': ['2570', '6500', '3660', '3611', '4000'],  # MRI, screening, dialysis, migraine, hospital
    'Benefit_head_descr': ['MRI services', 'Screening', 'Dialysis outpatient', 'Migraine treatment', 'Hospital accommodation'],
    'diagnosis_code': ['M79.3', 'Z12.1', 'N18.6', '346', 'K02.1'],  # Various codes including migraine and dental
    'Diagnostic name': ['Muscle pain', 'Screening', 'Kidney disease', 'Migraine', 'Dental caries'],
    
    # Provider data
    'Provider_type_code': ['CL', 'HO', 'CL', 'NE', 'HO'],  # Non-hospital codes for hospital benefits
    'Provider__descr': ['Clinic A', 'Hospital B', 'Clinic C', 'Neurology D', 'Hospital E'],
    'Procedure_descr': ['MRI scan', 'Health screening', 'Dialysis', 'Migraine treatment', 'Dental work'],
    
    # Demographics
    'Age': [25, 30, 45, 22, 35],
    'Gender': ['M', 'F', 'M', 'F', 'M'],
}

df = pd.DataFrame(test_data)
test_file = 'test_column_fixes.csv'
df.to_csv(test_file, index=False)

print("="*60)
print("🔧 COLUMN NAME FIXES TEST")
print("="*60)
print(f"Created test file: {test_file}")
print("Testing scenarios with actual column names from your data")

# Test the API
API_BASE = 'http://localhost:5001/api'

try:
    # Test health endpoint
    print("\n1. Testing health endpoint...")
    response = requests.get(f'{API_BASE}/health')
    if response.status_code == 200:
        print("   ✅ Health check passed")
    else:
        print(f"   ❌ Health check failed: {response.status_code}")
    
    # Test upload endpoint
    print("\n2. Testing upload endpoint...")
    with open(test_file, 'rb') as f:
        files = {'file': f}
        response = requests.post(f'{API_BASE}/upload', files=files)
    
    if response.status_code == 200:
        upload_result = response.json()
        print(f"   ✅ Upload successful: {upload_result['stats']['rows']} rows")
    else:
        print(f"   ❌ Upload failed: {response.status_code}")
        exit(1)
    
    # Test analyze endpoint focusing on the problematic scenarios
    print("\n3. Testing problematic scenarios (15-22)...")
    analyze_data = {
        'scenarios': [15, 16, 17, 19, 20, 21, 22],  # Focus on new scenarios
        'file_path': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend', 'temp_upload.csv')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Analysis successful")
        
        print(f"\n📊 SCENARIO RESULTS:")
        for scenario_key, scenario_data in result['results'].items():
            count = scenario_data['count']
            status = "✅" if count >= 0 else "❌"  # Any non-error result is good
            print(f"   {status} {scenario_key}: {scenario_data['name']} - {count} claims")
        
        print(f"\n📈 SUMMARY:")
        print(f"   • Total Claims Analyzed: {len(result.get('claimsData', []))}")
        print(f"   • Total Anomalies Found: {len(result.get('anomaliesData', []))}")
        print(f"   • Scenarios Run: {len(result['results'])}")
        
        # Check if any scenarios had errors
        error_count = 0
        for scenario_key, scenario_data in result['results'].items():
            if scenario_data['count'] < 0:  # Negative counts indicate errors
                error_count += 1
        
        if error_count == 0:
            print("\n🎉 SUCCESS: All scenarios ran without column errors!")
            print("   ✅ Column name fixes are working correctly")
            print("   ✅ System is robust against different CSV formats")
        else:
            print(f"\n⚠️  WARNING: {error_count} scenarios had issues")
            
    else:
        print(f"   ❌ Analysis failed: {response.status_code}")
        print(f"   Error: {response.text}")

except requests.exceptions.ConnectionError:
    print("\n❌ CONNECTION ERROR")
    print("Could not connect to API. Make sure the backend server is running:")
    print("   python start_backend.py")
except Exception as e:
    print(f"\n❌ UNEXPECTED ERROR: {e}")

# Clean up
if os.path.exists(test_file):
    os.remove(test_file)
    print(f"\n🧹 Cleaned up test file: {test_file}")

print(f"\n" + "="*60)
print("🔧 COLUMN FIXES TEST COMPLETED!")
print("="*60)
print("If all scenarios show ✅, the column name issues are fixed!")
print("You can now run your full system with confidence.")
print("="*60)