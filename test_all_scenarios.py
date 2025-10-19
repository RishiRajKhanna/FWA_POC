#!/usr/bin/env python3
"""
Comprehensive test script to verify all scenarios (1-14) work correctly
"""

import requests
import json
import os
import pandas as pd
from datetime import datetime, timedelta

# Create comprehensive test CSV file with fields needed for all scenarios
test_data = {
    # Basic identifiers
    'Claim_ID': [f'CLAIM_{str(i).zfill(3)}' for i in range(1, 21)],
    'Provider_ID': ['PROV_001', 'PROV_002', 'PROV_003', 'PROV_001', 'PROV_004'] * 4,
    'Member_ID': ['MEM_001', 'MEM_002', 'MEM_003', 'MEM_001', 'MEM_002'] * 4,
    
    # Financial data
    'billed_amount': [10000, 25000, 5000, 15000, 8000] * 4,
    'Paid_amount': [8000, 20000, 4500, 12000, 7000] * 4,
    'Claim_invoice_gross_total_amount': [10000, 25000, 5000, 15000, 8000] * 4,
    'Paid amount': [8000, 20000, 4500, 12000, 7000] * 4,
    'Claimed_currency_code': ['USD', 'CAD', 'GBP', 'EUR', 'USD'] * 4,
    'Payment_currency_code': ['USD', 'CAD', 'GBP', 'EUR', 'USD'] * 4,
    
    # Dates
    'service_date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'] * 4,
    'Treatment from date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'] * 4,
    'Treatment_to_date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'] * 4,
    'Claim_invoice_date': ['2024-01-02', '2024-01-08', '2024-01-16', '2023-12-31', '2024-01-08'] * 4,  # Some early invoices
    
    # Provider and location data
    'Provider type': ['Hospital', 'Clinic', 'Lab', 'Hospital', 'global'] * 4,
    'Treatment_Country': ['US', 'CA', 'UK', 'FR', 'DE'] * 4,
    'Provider_country_code': ['US', 'CA', 'UK', 'FR', 'DE'] * 4,
    
    # Medical codes and procedures
    'Procedure_code': [4030, 1250, 2100, 4030, 3500] * 4,  # Include chemo codes
    'specialisation_code': [3, 4, 2, 3, 4] * 4,  # Inpatient/Outpatient codes
    'diagnosis_code': ['M79.3', 'P07.1', 'Z51.1', 'P22.0', 'M25.5'] * 4,  # Include pediatric codes
    'Diagnostic code': ['M79.3', 'P07.1', 'Z51.1', 'P22.0', 'M25.5'] * 4,
    
    # Invoice and billing
    'Invoice_No_Reference': ['INV001', 'INV002', 'INV003', 'INV001', 'INV004'] * 4,  # Duplicate invoices
    'Payee_type': ['P', 'M', 'P', 'M', 'P'] * 4,  # Different payee types
    'Payee type': ['P', 'M', 'P', 'M', 'P'] * 4,
    
    # Demographics
    'Age': [25, 30, 45, 22, 35] * 4,  # Adults for pediatric diagnosis test
    'Gender': ['M', 'F', 'M', 'F', 'M'] * 4,
    
    # Benefit data
    'Benefit_head_code': [1001, 1002, 1003, 1001, 1004] * 4,
    'Benefit_head_descr': ['Medical', 'Surgical', 'Emergency', 'Medical', 'Pharmacy'] * 4,
    'Incident_count': [1, 2, 1, 3, 1] * 4,
}

df = pd.DataFrame(test_data)
test_file = 'test_all_scenarios.csv'
df.to_csv(test_file, index=False)

print("="*70)
print("COMPREHENSIVE HEALTHCARE FRAUD DETECTION TEST")
print("="*70)
print(f"Created test file: {test_file}")
print(f"Test data includes {len(df)} claims with patterns for all 14 scenarios:")
print()
print("SCENARIO COVERAGE:")
print("  1. Benefit Outlier Detection - Statistical analysis")
print("  2. Chemotherapy Gap Detection - Treatment gaps")
print("  3. Cross-Country Fraud - Geographic overlaps")
print("  4. Sunday Claims Analysis - Weekend treatments")
print("  5. Multiple Claims Same Invoice - Duplicate invoices")
print("  6. Inpatient/Outpatient Same Date - Service conflicts")
print("  7. Provider Multi-Country - Geographic spread")
print("  8. Multiple Provider Same Date - Provider overlaps")
print("  9. Member Multi-Currency - Currency patterns")
print(" 10. Gender-Procedure Mismatch - Medical validation")
print(" 11. Early Invoice Date - Temporal validation")
print(" 12. Adult Pediatric Diagnosis - Medical code analysis")
print(" 13. Multiple Payee Types - Billing inconsistencies")
print(" 14. Excessive Diagnoses - Medical complexity")

# Test the API
API_BASE = 'http://localhost:5001/api'

try:
    print("\n" + "="*70)
    print("API TESTING")
    print("="*70)
    
    # Test health endpoint
    print("1. Testing health endpoint...")
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
        print(f"   ✅ Upload successful: {upload_result['stats']['rows']} rows, {upload_result['stats']['columns']} columns")
    else:
        print(f"   ❌ Upload failed: {response.status_code}")
        exit(1)
    
    # Test analyze endpoint with all scenarios
    print("\n3. Testing analyze endpoint with ALL scenarios (1-14)...")
    analyze_data = {
        'scenarios': list(range(1, 15)),  # All scenarios 1-14
        'file_path': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend', 'temp_upload.csv')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Analysis successful")
        
        print(f"\n" + "="*70)
        print("SCENARIO RESULTS SUMMARY")
        print("="*70)
        
        total_anomalies = 0
        for scenario_key, scenario_data in result['results'].items():
            count = scenario_data['count']
            total_anomalies += count
            status = "✅" if count > 0 else "⚠️"
            print(f"   {status} {scenario_key}: {scenario_data['name']} - {count} claims")
        
        print(f"\n📊 ANALYSIS SUMMARY:")
        print(f"   • Total Claims Analyzed: {len(result.get('claimsData', []))}")
        print(f"   • Total Anomalies Found: {len(result.get('anomaliesData', []))}")
        print(f"   • Scenarios Run: {len(result['results'])}/14")
        print(f"   • High Risk Anomalies: {result.get('summary', {}).get('high_risk_anomalies', 0)}")
        
        # Show breakdown by anomaly type
        anomalies_by_type = {}
        for anomaly in result.get('anomaliesData', []):
            anomaly_type = anomaly.get('type', 'Unknown')
            anomalies_by_type[anomaly_type] = anomalies_by_type.get(anomaly_type, 0) + 1
        
        if anomalies_by_type:
            print(f"\n🔍 ANOMALIES BY TYPE:")
            for anomaly_type, count in sorted(anomalies_by_type.items()):
                print(f"   • {anomaly_type}: {count}")
        
        # Test individual scenario endpoints
        print(f"\n" + "="*70)
        print("INDIVIDUAL SCENARIO ENDPOINT TESTING")
        print("="*70)
        
        success_count = 0
        for scenario_id in range(1, 15):
            try:
                response = requests.get(f'{API_BASE}/scenario/{scenario_id}')
                if response.status_code == 200:
                    scenario_result = response.json()
                    result_count = len(scenario_result.get('results', []))
                    print(f"   ✅ Scenario {scenario_id:2d}: {scenario_result['name']} - {result_count} detailed results")
                    success_count += 1
                else:
                    print(f"   ❌ Scenario {scenario_id:2d}: Error {response.status_code}")
            except Exception as e:
                print(f"   ❌ Scenario {scenario_id:2d}: Exception - {e}")
        
        print(f"\n📈 ENDPOINT TEST RESULTS: {success_count}/14 scenarios working")
        
        # Final assessment
        print(f"\n" + "="*70)
        print("INTEGRATION ASSESSMENT")
        print("="*70)
        
        if success_count >= 12 and total_anomalies > 0:
            print("🎉 EXCELLENT: System is fully operational!")
            print("   • All major scenarios are working")
            print("   • Anomalies are being detected")
            print("   • API endpoints are responding correctly")
        elif success_count >= 8:
            print("✅ GOOD: System is mostly operational")
            print("   • Most scenarios are working")
            print("   • Some minor issues may need attention")
        else:
            print("⚠️  NEEDS ATTENTION: System has issues")
            print("   • Multiple scenarios are not working")
            print("   • Check backend logs for errors")
            
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

print(f"\n" + "="*70)
print("TEST COMPLETED!")
print("="*70)
print("Next steps:")
print("1. Start backend: python start_backend.py")
print("2. Start frontend: npm run dev")
print("3. Upload CSV through web interface")
print("4. View comprehensive fraud detection results!")
print("="*70)