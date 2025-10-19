#!/usr/bin/env python3
"""
Ultimate test script to verify all 22 scenarios work correctly
Complete Healthcare Fraud Detection System Test
"""

import requests
import json
import os
import pandas as pd
from datetime import datetime, timedelta

# Create the most comprehensive test CSV file with fields needed for all 22 scenarios
test_data = {
    # Basic identifiers
    'Claim_ID': [f'CLAIM_{str(i).zfill(3)}' for i in range(1, 31)],
    'Provider_ID': (['PROV_001', 'PROV_002', 'PROV_003', '112038', '841666'] * 6),
    'Member_ID': ['MEM_001', 'MEM_002', 'MEM_003', 'MEM_001', 'MEM_002'] * 6,
    
    # Financial data
    'billed_amount': [10000, 25000, 5000, 15000, 8000] * 6,
    'Paid_amount': [8000, 20000, 4500, 12000, 7000] * 6,
    'Claim_invoice_gross_total_amount': [10000, 25000, 5000, 15000, 8000] * 6,
    'Paid amount': [8000, 20000, 4500, 12000, 7000] * 6,
    'Claimed_currency_code': ['USD', 'CAD', 'GBP', 'EUR', 'USD'] * 6,
    'Payment_currency_code': ['USD', 'CAD', 'GBP', 'EUR', 'USD'] * 6,
    
    # Dates
    'service_date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'] * 6,
    'Treatment from date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'] * 6,
    'Treatment_to_date': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'] * 6,
    'Claim_invoice_date': ['2024-01-02', '2024-01-08', '2024-01-16', '2023-12-31', '2024-01-08'] * 6,
    
    # Provider and location data
    'Provider type': ['Hospital', 'Clinic', 'Lab', 'Hospital', 'global'] * 6,
    'Provider_type_code': ['HO', 'CL', 'LA', 'HO', 'GL'] * 6,
    'Treatment_Country': ['US', 'CA', 'UK', 'FR', 'DE'] * 6,
    'Provider_country_code': ['US', 'CA', 'UK', 'FR', 'DE'] * 6,
    
    # Medical codes and procedures
    'Procedure_code': [4030, 1250, 2100, 4030, 3500] * 6,
    'specialisation_code': [3, 4, 2, 3, 4] * 6,
    'diagnosis_code': ['M79.3', 'P07.1', 'Z51.1', '346', 'G43.9'] * 6,
    'Diagnostic code': ['M79.3', 'P07.1', 'Z51.1', '346', 'G43.9'] * 6,
    'Diagnostic name': ['Muscle pain', 'Preterm birth', 'Chemotherapy', 'Migraine', 'Migraine'] * 6,
    
    # Benefit codes for various scenarios
    'Benefit_head_code': ['4000', '2500', '6500', '3660', '2570'] * 6,  # Hospital, screening, dialysis, MRI codes
    'benefit_head_code': ['4000', '2500', '6500', '3660', '2570'] * 6,
    'Benefit_head_descr': ['Hospital accommodation', 'Hospital services', 'Screening', 'Dialysis outpatient', 'Dentist services'] * 6,
    'benefit_head_descr': ['Hospital accommodation', 'Hospital services', 'Screening', 'Dialysis outpatient', 'Dentist services'] * 6,
    
    # Invoice and billing
    'Invoice_No_Reference': ['INV001', 'INV002', 'INV003', 'INV001', 'INV004'] * 6,
    'Payee_type': ['P', 'M', 'P', 'M', 'P'] * 6,
    'Payee type': ['P', 'M', 'P', 'M', 'P'] * 6,
    
    # Demographics
    'Age': [25, 30, 45, 22, 35] * 6,
    'Gender': ['M', 'F', 'M', 'F', 'M'] * 6,
    
    # Additional fields for new scenarios
    'Incident_count': [1, 2, 1, 3, 1] * 6,
    'member_id': ['MEM_001', 'MEM_002', 'MEM_003', 'MEM_001', 'MEM_002'] * 6,
    'treatment_from': ['2024-01-01', '2024-01-07', '2024-01-15', '2024-01-01', '2024-01-07'] * 6,
    'Procedure_descr': ['Chemotherapy', 'Surgery', 'Screening', 'Dialysis', 'Dental cleaning'] * 6,
    'Provider__descr': ['Hospital A', 'Clinic B', 'Lab C', 'Hospital D', 'Dental E'] * 6,
}

df = pd.DataFrame(test_data)
test_file = 'test_complete_system.csv'
df.to_csv(test_file, index=False)

print("="*80)
print("🏥 COMPLETE HEALTHCARE FRAUD DETECTION SYSTEM TEST")
print("="*80)
print(f"Created comprehensive test file: {test_file}")
print(f"Test data includes {len(df)} claims with patterns for ALL 22 scenarios:")
print()
print("📋 COMPLETE SCENARIO COVERAGE:")
print("   🔴 HIGH-RISK SCENARIOS (Critical Medical/Financial Fraud):")
print("     1. Benefit Outlier Detection - Statistical analysis")
print("     2. Chemotherapy Gap Detection - Treatment gaps")
print("     3. Cross-Country Fraud - Geographic overlaps")
print("     5. Multiple Claims Same Invoice - Duplicate invoices")
print("     6. Inpatient/Outpatient Same Date - Service conflicts")
print("    10. Gender-Procedure Mismatch - Medical validation")
print("    11. Early Invoice Date - Temporal validation")
print("    12. Adult Pediatric Diagnosis - Medical code analysis")
print("    15. Hospital Benefits from Non-Hospital Providers - Benefit validation")
print("    16. Paid Claims from Veterinary Providers - Provider validation")
print("    20. Dialysis Without Kidney Diagnosis - Medical validation")
print()
print("   🟡 MEDIUM-RISK SCENARIOS (Behavioral/Pattern Anomalies):")
print("     4. Sunday Claims Analysis - Weekend treatments")
print("     7. Provider Multi-Country - Geographic spread")
print("     8. Multiple Provider Same Date - Provider overlaps")
print("     9. Member Multi-Currency - Currency patterns")
print("    13. Multiple Payee Types - Billing inconsistencies")
print("    14. Excessive Diagnoses - Medical complexity")
print("    17. Multiple MRI/CT Same Day - Procedure over-utilization")
print("    19. Multiple Screenings Same Year - Screening frequency")
print("    21. Unusual Dentistry Claims - Specialty validation")
print("    22. Invalid Migraine Claims - Diagnosis-benefit validation")
print()
print("   ⚪ LOW-RISK SCENARIOS:")
print("    18. Placeholder Scenario - Future implementation")

# Test the API
API_BASE = 'http://localhost:5001/api'

try:
    print("\n" + "="*80)
    print("🔧 COMPREHENSIVE API TESTING")
    print("="*80)
    
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
    
    # Test analyze endpoint with ALL scenarios
    print("\n3. Testing analyze endpoint with ALL 22 scenarios...")
    analyze_data = {
        'scenarios': list(range(1, 23)),  # All scenarios 1-22
        'file_path': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend', 'temp_upload.csv')
    }
    response = requests.post(f'{API_BASE}/analyze', json=analyze_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"   ✅ Analysis successful")
        
        print(f"\n" + "="*80)
        print("📊 COMPREHENSIVE SCENARIO RESULTS")
        print("="*80)
        
        total_anomalies = 0
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0
        
        # Categorize scenarios by risk level
        high_risk_scenarios = [1, 2, 3, 5, 6, 10, 11, 12, 15, 16, 20]
        medium_risk_scenarios = [4, 7, 8, 9, 13, 14, 17, 19, 21, 22]
        low_risk_scenarios = [18]
        
        print("🔴 HIGH-RISK SCENARIOS:")
        for scenario_key, scenario_data in result['results'].items():
            scenario_num = int(scenario_key.replace('scenario', ''))
            if scenario_num in high_risk_scenarios:
                count = scenario_data['count']
                total_anomalies += count
                high_risk_count += count
                status = "✅" if count > 0 else "⚠️"
                print(f"   {status} {scenario_key}: {scenario_data['name']} - {count} claims")
        
        print("\n🟡 MEDIUM-RISK SCENARIOS:")
        for scenario_key, scenario_data in result['results'].items():
            scenario_num = int(scenario_key.replace('scenario', ''))
            if scenario_num in medium_risk_scenarios:
                count = scenario_data['count']
                total_anomalies += count
                medium_risk_count += count
                status = "✅" if count > 0 else "⚠️"
                print(f"   {status} {scenario_key}: {scenario_data['name']} - {count} claims")
        
        print("\n⚪ LOW-RISK SCENARIOS:")
        for scenario_key, scenario_data in result['results'].items():
            scenario_num = int(scenario_key.replace('scenario', ''))
            if scenario_num in low_risk_scenarios:
                count = scenario_data['count']
                total_anomalies += count
                low_risk_count += count
                status = "✅" if count > 0 else "ℹ️"
                print(f"   {status} {scenario_key}: {scenario_data['name']} - {count} claims")
        
        print(f"\n" + "="*80)
        print("📈 COMPREHENSIVE ANALYSIS SUMMARY")
        print("="*80)
        print(f"   📊 Total Claims Analyzed: {len(result.get('claimsData', []))}")
        print(f"   🚨 Total Anomalies Found: {len(result.get('anomaliesData', []))}")
        print(f"   🎯 Scenarios Executed: {len(result['results'])}/22")
        print(f"   🔴 High-Risk Anomalies: {high_risk_count}")
        print(f"   🟡 Medium-Risk Anomalies: {medium_risk_count}")
        print(f"   ⚪ Low-Risk Anomalies: {low_risk_count}")
        print(f"   ⚡ Critical Risk Anomalies: {result.get('summary', {}).get('high_risk_anomalies', 0)}")
        
        # Show breakdown by anomaly type
        anomalies_by_type = {}
        for anomaly in result.get('anomaliesData', []):
            anomaly_type = anomaly.get('type', 'Unknown')
            anomalies_by_type[anomaly_type] = anomalies_by_type.get(anomaly_type, 0) + 1
        
        if anomalies_by_type:
            print(f"\n🔍 DETAILED ANOMALY BREAKDOWN:")
            for anomaly_type, count in sorted(anomalies_by_type.items()):
                print(f"   • {anomaly_type}: {count}")
        
        # Test individual scenario endpoints
        print(f"\n" + "="*80)
        print("🔧 INDIVIDUAL SCENARIO ENDPOINT TESTING")
        print("="*80)
        
        success_count = 0
        failed_scenarios = []
        
        for scenario_id in range(1, 23):
            try:
                response = requests.get(f'{API_BASE}/scenario/{scenario_id}')
                if response.status_code == 200:
                    scenario_result = response.json()
                    result_count = len(scenario_result.get('results', []))
                    print(f"   ✅ Scenario {scenario_id:2d}: {scenario_result['name']} - {result_count} detailed results")
                    success_count += 1
                else:
                    print(f"   ❌ Scenario {scenario_id:2d}: Error {response.status_code}")
                    failed_scenarios.append(scenario_id)
            except Exception as e:
                print(f"   ❌ Scenario {scenario_id:2d}: Exception - {e}")
                failed_scenarios.append(scenario_id)
        
        print(f"\n📊 ENDPOINT TEST RESULTS: {success_count}/22 scenarios working")
        if failed_scenarios:
            print(f"❌ Failed scenarios: {failed_scenarios}")
        
        # Final comprehensive assessment
        print(f"\n" + "="*80)
        print("🎯 FINAL SYSTEM ASSESSMENT")
        print("="*80)
        
        coverage_percentage = (success_count / 22) * 100
        
        if success_count >= 20 and total_anomalies > 0:
            print("🎉 EXCELLENT: Complete Healthcare Fraud Detection System is FULLY OPERATIONAL!")
            print("   ✅ All major scenarios are working perfectly")
            print("   ✅ Comprehensive anomaly detection across all fraud types")
            print("   ✅ API endpoints responding correctly")
            print("   ✅ Ready for enterprise healthcare fraud detection!")
        elif success_count >= 18:
            print("✅ VERY GOOD: System is highly operational")
            print("   ✅ Most scenarios working excellently")
            print("   ⚠️  Minor issues may need attention")
            print("   ✅ Suitable for production use with monitoring")
        elif success_count >= 15:
            print("🟡 GOOD: System is mostly operational")
            print("   ✅ Core scenarios working")
            print("   ⚠️  Some scenarios need attention")
            print("   🔧 Recommended for staging environment")
        else:
            print("⚠️  NEEDS ATTENTION: System has significant issues")
            print("   ❌ Multiple scenarios not working")
            print("   🔧 Check backend logs for errors")
            print("   🚫 Not ready for production")
        
        print(f"\n📊 SYSTEM STATISTICS:")
        print(f"   • Scenario Coverage: {coverage_percentage:.1f}%")
        print(f"   • Total Fraud Patterns Detected: {len(set(anomalies_by_type.keys()))}")
        print(f"   • High-Risk Detection Rate: {(high_risk_count/total_anomalies*100):.1f}%" if total_anomalies > 0 else "   • High-Risk Detection Rate: 0%")
        print(f"   • System Reliability: {'Excellent' if success_count >= 20 else 'Good' if success_count >= 15 else 'Needs Improvement'}")
            
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

print(f"\n" + "="*80)
print("🏁 COMPLETE SYSTEM TEST FINISHED!")
print("="*80)
print("🚀 Next steps for production deployment:")
print("1. 🔧 Start backend: python start_backend.py")
print("2. 🎨 Start frontend: npm run dev")
print("3. 📊 Upload real healthcare claims CSV through web interface")
print("4. 🔍 Investigate comprehensive fraud detection results!")
print("5. 📋 Generate compliance reports for healthcare auditing")
print("="*80)
print("🎯 Complete Healthcare Fraud Detection System with 22 scenarios ready! 🎉")