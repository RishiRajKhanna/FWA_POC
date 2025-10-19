import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  DollarSign, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  ExternalLink,
  Clock,
  Eye,
  X
} from 'lucide-react';

interface MainDashboardProps {
  claimsData: any[];
  anomaliesData: any[];
  scenarioResults?: any;
  summary?: any;
}

export default function MainDashboard({ claimsData, anomaliesData, scenarioResults, summary }: MainDashboardProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [showScenarioDetails, setShowScenarioDetails] = useState(false);

  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showScenarioDetails) {
        setShowScenarioDetails(false);
      }
    };

    if (showScenarioDetails) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showScenarioDetails]);

  
  // Calculate KPIs from uploaded data
  const calculateKPIs = () => {
    if (!claimsData.length) return {
      totalAtRisk: 0,
      activeInvestigations: 0,
      highRiskProviders: 0,
      claimsFlagged: 0
    };

    const totalAtRisk = anomaliesData.reduce((sum, anomaly) => 
      sum + (anomaly.billed_amount || 0), 0
    );
    
    const highRiskAnomalies = anomaliesData.filter(a => a.risk_score >= 75);
    const providerIds = new Set(anomaliesData.map(a => a.provider_id));
    
    return {
      totalAtRisk,
      activeInvestigations: anomaliesData.length,
      highRiskProviders: providerIds.size,
      claimsFlagged: highRiskAnomalies.length
    };
  };

  const kpiData = calculateKPIs();

  // Generate trend data from claims
  const generateTrendData = () => {
    if (!claimsData.length) return [];
    
    const monthlyData: { [key: string]: number } = {};
    claimsData.forEach(claim => {
      const date = new Date(claim.service_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + claim.billed_amount;
    });

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    }));
  };

  const riskTrendData = generateTrendData();

  // Get top risk providers from anomalies
  const getTopRiskProviders = () => {
    if (!anomaliesData.length) return [];
    
    const providerStats: { [key: string]: any } = {};
    
    anomaliesData.forEach(anomaly => {
      const id = anomaly.provider_id;
      if (!providerStats[id]) {
        providerStats[id] = {
          id,
          name: anomaly.provider_name,
          riskScore: 0,
          flaggedClaims: 0,
          atRisk: 0,
          totalRiskScore: 0
        };
      }
      
      providerStats[id].flaggedClaims++;
      providerStats[id].atRisk += anomaly.billed_amount || 0;
      providerStats[id].totalRiskScore += anomaly.risk_score;
    });

    return Object.values(providerStats)
      .map(provider => ({
        ...provider,
        riskScore: Math.round(provider.totalRiskScore / provider.flaggedClaims)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  };

  const topRiskProviders = getTopRiskProviders();

  // Get top procedures from claims data
  const getTopRiskProcedures = () => {
    if (!claimsData.length) return [];
    
    const procedureStats: { [key: string]: any } = {};
    
    claimsData.forEach(claim => {
      const code = claim.procedure_code;
      if (!procedureStats[code]) {
        procedureStats[code] = {
          code,
          description: `Procedure ${code}`,
          flaggedCount: 0,
          riskScore: 0
        };
      }
      
      // Check if this claim has associated anomalies
      const hasAnomaly = anomaliesData.some(a => a.claim_id === claim.claim_id);
      if (hasAnomaly) {
        procedureStats[code].flaggedCount++;
      }
    });

    return Object.values(procedureStats)
      .filter(proc => proc.flaggedCount > 0)
      .map(proc => ({
        ...proc,
        riskScore: Math.min(100, proc.flaggedCount * 5) // Simple risk calculation
      }))
      .sort((a, b) => b.flaggedCount - a.flaggedCount)
      .slice(0, 5);
  };

  const topRiskProcedures = getTopRiskProcedures();

  // Analyze scenarios and their results
  const getScenarioBreakdown = () => {

    
    if (!anomaliesData.length) return [];
    
    const scenarioStats: { [key: string]: any } = {};
    
    anomaliesData.forEach(anomaly => {
      const scenarioType = anomaly.type;
      if (!scenarioStats[scenarioType]) {
        scenarioStats[scenarioType] = {
          name: scenarioType,
          method: anomaly.method,
          count: 0,
          totalRisk: 0,
          avgRiskScore: 0,
          highRiskCount: 0,
          claims: [],
          severity: {
            high: 0,
            medium: 0,
            low: 0
          }
        };
      }
      
      const scenario = scenarioStats[scenarioType];
      scenario.count++;
      scenario.totalRisk += anomaly.billed_amount || 0;
      scenario.claims.push(anomaly);
      
      // Count by severity
      const severity = anomaly.severity?.toLowerCase() || 'medium';
      if (scenario.severity[severity] !== undefined) {
        scenario.severity[severity]++;
      }
      
      // Count high risk (score >= 75)
      if (anomaly.risk_score >= 75) {
        scenario.highRiskCount++;
      }
    });

    // Calculate averages and sort by count
    return Object.values(scenarioStats)
      .map(scenario => ({
        ...scenario,
        avgRiskScore: Math.round(scenario.claims.reduce((sum: number, claim: any) => sum + (claim.risk_score || 0), 0) / scenario.count),
        avgAmount: Math.round(scenario.totalRisk / scenario.count)
      }))
      .sort((a, b) => b.count - a.count);
  };

  const scenarioBreakdown = getScenarioBreakdown();

  // Get scenario performance data for charts using actual backend results
  const getScenarioChartData = () => {
    if (scenarioResults) {
      return Object.entries(scenarioResults)
        .filter(([key, data]: [string, any]) => data.count > 0) // Filter out scenarios with zero count
        .map(([key, data]: [string, any]) => ({
          name: data.name.replace(/\s+/g, '\n'),
          count: data.count,
          risk: 85, // Default risk score
          amount: data.count * 15000 // Estimated amount
        }))
        .sort((a, b) => b.count - a.count); // Sort by count in descending order
    }
    return scenarioBreakdown
      .filter(scenario => scenario.count > 0) // Filter out scenarios with zero count
      .map(scenario => ({
        name: scenario.name.replace(/\s+/g, '\n'), // Break long names
        count: scenario.count,
        risk: scenario.avgRiskScore,
        amount: scenario.totalRisk
      }))
      .sort((a, b) => b.count - a.count); // Sort by count in descending order
  };

  const scenarioChartData = getScenarioChartData();

  // Get claims grouped by scenario
  const getClaimsByScenario = () => {
    const claimsByScenario: { [key: string]: any[] } = {};
    
    anomaliesData.forEach(anomaly => {
      const scenarioType = anomaly.type;
      if (!claimsByScenario[scenarioType]) {
        claimsByScenario[scenarioType] = [];
      }
      claimsByScenario[scenarioType].push(anomaly);
    });

    // Sort claims within each scenario by risk score
    Object.keys(claimsByScenario).forEach(scenario => {
      claimsByScenario[scenario].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
    });

    return claimsByScenario;
  };

  const claimsByScenario = getClaimsByScenario();

  // Export Report functionality
  const handleExportReport = () => {
    if (!scenarioResults || !anomaliesData.length) {
      alert('No data available to export. Please upload and analyze claims data first.');
      return;
    }

    // Prepare export data with all flagged claims mapped to scenarios
    const exportData: any[] = [];
    
    // Map scenario keys to readable names
    const scenarioNames: { [key: string]: string } = {
      'scenario1': 'Benefit Outlier Detection',
      'scenario2': 'Chemotherapy Gap Detection', 
      'scenario3': 'Cross-Country Fraud Detection',
      'scenario4': 'Sunday Claims Analysis',
      'scenario5': 'Multiple Claims Same Invoice',
      'scenario6': 'Inpatient/Outpatient Same Date',
      'scenario7': 'Provider Multi-Country',
      'scenario8': 'Multiple Provider Same Date',
      'scenario9': 'Member Multi-Currency',
      'scenario10': 'Gender-Procedure Mismatch',
      'scenario11': 'Early Invoice Date',
      'scenario12': 'Adult Pediatric Diagnosis',
      'scenario13': 'Multiple Payee Types',
      'scenario14': 'Excessive Diagnoses',
      'scenario15': 'Hospital Benefits from Non-Hospital Providers',
      'scenario16': 'Paid Claims from Veterinary Providers',
      'scenario17': 'Multiple MRI/CT Same Day',
      'scenario18': 'Placeholder Scenario',
      'scenario19': 'Multiple Screenings Same Year',
      'scenario20': 'Dialysis Without Kidney Diagnosis',
      'scenario21': 'Unusual Dentistry Claims',
      'scenario22': 'Invalid Migraine Claims'
    };

    // Process each scenario's results
    Object.entries(scenarioResults).forEach(([scenarioKey, scenarioData]: [string, any]) => {
      const scenarioName = scenarioNames[scenarioKey] || scenarioData.name;
      const scenarioClaims = getClaimsForScenario(scenarioKey);
      
      scenarioClaims.forEach((claim) => {
        // Find matching CSV data for comprehensive export
        const csvClaim = claimsData.find(csvRow => 
          csvRow['Claim_ID'] === claim.claim_id || 
          csvRow.claim_id === claim.claim_id
        );

        exportData.push({
          // Scenario Information
          'Scenario_Number': scenarioKey.replace('scenario', ''),
          'Scenario_Name': scenarioName,
          'Risk_Level': scenarioKey === 'scenario2' ? 'Critical' : 
                       ['scenario1', 'scenario3', 'scenario5', 'scenario6', 'scenario10', 'scenario11', 'scenario12', 'scenario15', 'scenario16', 'scenario20'].includes(scenarioKey) ? 'High' : 'Medium',
          
          // Claim Identification
          'Claim_ID': claim.claim_id || 'N/A',
          'Member_ID': csvClaim?.['Member_ID'] || claim.member_id || 'N/A',
          'Provider_ID': csvClaim?.['Provider_ID'] || claim.provider_id || 'N/A',
          
          // Financial Information
          'Billed_Amount': csvClaim?.['Claim_invoice_gross_total_amount'] || claim.billed_amount || 0,
          'Paid_Amount': csvClaim?.['Paid_amount'] || claim.paid_amount || 0,
          'Claimed_Currency': csvClaim?.['Claimed_currency_code'] || claim.claimed_currency || 'N/A',
          'Payment_Currency': csvClaim?.['Payment_currency_code'] || claim.payment_currency || 'N/A',
          
          // Provider Information
          'Provider_Name': csvClaim?.['Provider__descr'] || claim.provider_name || 'N/A',
          'Provider_Type': csvClaim?.['Provider type'] || claim.provider_type || 'N/A',
          'Provider_Country': csvClaim?.['Provider_country_code'] || claim.provider_country || 'N/A',
          'Specialisation_Code': csvClaim?.['specialisation_code'] || 'N/A',
          
          // Medical Information
          'Benefit_Code': csvClaim?.['Benefit_head_code'] || claim.benefit_code || 'N/A',
          'Benefit_Description': csvClaim?.['Benefit_head_descr'] || claim.benefit_description || 'N/A',
          'Procedure_Code': csvClaim?.['Procedure_code'] || claim.procedure_code || 'N/A',
          'Procedure_Description': csvClaim?.['Procedure_descr'] || claim.procedure_description || 'N/A',
          'Diagnosis_Code': csvClaim?.['diagnosis_code'] || claim.diagnosis_code || 'N/A',
          'Diagnosis_Name': csvClaim?.['Diagnostic name'] || claim.diagnosis_name || 'N/A',
          
          // Date Information
          'Service_Date': csvClaim?.['Treatment from date'] || claim.service_date || 'N/A',
          'Treatment_To_Date': csvClaim?.['Treatment_to_date'] || claim.treatment_to_date || 'N/A',
          'Invoice_Date': csvClaim?.['Claim_invoice_date'] || claim.invoice_date || 'N/A',
          
          // Patient Information
          'Gender': csvClaim?.['Gender'] || claim.gender || 'N/A',
          'Age': csvClaim?.['Age'] || claim.age || 'N/A',
          'Treatment_Country': csvClaim?.['Treatment_Country'] || claim.treatment_country || 'N/A',
          
          // Payment Information
          'Payee_Type': csvClaim?.['Payee_type'] || claim.payee_type || 'N/A',
          'Payee_Rule_Code': csvClaim?.['Payee_rule_code'] || claim.payee_rule_code || 'N/A',
          'Payee_Rule_Description': csvClaim?.['Payee_rule_descr'] || claim.payee_rule_description || 'N/A',
          
          // Additional Information
          'Invoice_Reference': csvClaim?.['Invoice_No_Reference'] || claim.invoice_reference || 'N/A',
          'Incident_Count': csvClaim?.['Incident_count'] || claim.incident_count || 0,
          'Risk_Score': claim.risk_score || 0,
          'Severity': claim.severity || 'Medium',
          'Fraud_Description': claim.description || 'Flagged by automated fraud detection',
          
          // Export Metadata
          'Export_Date': new Date().toISOString().split('T')[0],
          'Export_Time': new Date().toLocaleTimeString()
        });
      });
    });

    // Convert to CSV format
    if (exportData.length === 0) {
      alert('No flagged claims found to export.');
      return;
    }

    const csvHeaders = Object.keys(exportData[0]);
    const csvContent = [
      csvHeaders.join(','),
      ...exportData.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const totalClaims = exportData.length;
    const scenarioCount = Object.keys(scenarioResults).length;
    
    link.setAttribute('download', `Healthcare_Fraud_Report_${timestamp}_${totalClaims}claims_${scenarioCount}scenarios.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    alert(`Successfully exported ${totalClaims} flagged claims from ${scenarioCount} fraud detection scenarios to CSV file.`);
  };

  // Get claims for a specific scenario with full CSV data
  const getClaimsForScenario = (scenarioKey: string) => {
    const scenarioTypeMap: { [key: string]: string } = {
      'scenario1': 'Benefit Outlier',
      'scenario2': 'Chemotherapy Gap', 
      'scenario3': 'Cross-Country Fraud',
      'scenario4': 'Sunday Treatment',
      'scenario5': 'Duplicate Invoice',
      'scenario6': 'Service Type Conflict',
      'scenario7': 'Multi-Country Provider',
      'scenario8': 'Provider Overlap',
      'scenario9': 'Multi-Currency Member',
      'scenario10': 'Gender-Procedure Mismatch',
      'scenario11': 'Early Invoice Date',
      'scenario12': 'Adult Pediatric Diagnosis',
      'scenario13': 'Multiple Payee Types',
      'scenario14': 'Excessive Diagnoses',
      'scenario15': 'Hospital Benefit Mismatch',
      'scenario16': 'Veterinary Provider Claims',
      'scenario17': 'Multiple MRI/CT Same Day',
      'scenario18': 'Placeholder Scenario',
      'scenario19': 'Multiple Screenings Same Year',
      'scenario20': 'Dialysis Without Kidney Diagnosis',
      'scenario21': 'Unusual Dentistry Claims',
      'scenario22': 'Invalid Migraine Claims'
    };
    
    const scenarioType = scenarioTypeMap[scenarioKey];
    const scenarioAnomalies = anomaliesData.filter(anomaly => anomaly.type === scenarioType);
    
    console.log('Scenario anomalies:', scenarioAnomalies);
    console.log('Sample CSV claim data:', claimsData[0]);
    
    // Merge anomaly data with full CSV claims data
    return scenarioAnomalies.map(anomaly => {
      // Find the corresponding claim in the CSV data using exact column name from CSV
      // The CSV uses 'Claim_ID' but anomaly uses 'claim_id'
      const csvClaim = claimsData.find(claim => 
        claim['Claim_ID'] === anomaly.claim_id || 
        claim.claim_id === anomaly.claim_id
      );
      
      console.log(`Looking for claim ${anomaly.claim_id}:`, csvClaim);
      if (csvClaim) {
        console.log('Available CSV columns:', Object.keys(csvClaim));
        console.log('Sample CSV data for debugging:', {
          'Claim_ID': csvClaim['Claim_ID'],
          'Provider__descr': csvClaim['Provider__descr'],
          'Provider type': csvClaim['Provider type'],
          'Benefit_head_descr': csvClaim['Benefit_head_descr'],
          'Diagnostic name': csvClaim['Diagnostic name']
        });
      }
      
      if (csvClaim) {
        // Return merged data using exact CSV column names from data.csv header
        return {
          ...anomaly,
          csvData: csvClaim, // Include full CSV data for debugging
          
          // Financial fields - using exact CSV column names
          gross_total_amount: parseFloat(csvClaim['Claim_invoice_gross_total_amount']) || 0,
          paid_amount: parseFloat(csvClaim['Paid_amount']) || 0,
          claimed_currency: csvClaim['Claimed_currency_code'] || 'N/A',
          payment_currency: csvClaim['Payment_currency_code'] || 'N/A',
          
          // Provider fields - using exact CSV column names
          provider_country: csvClaim['Provider_country_code'] || 'N/A',
          provider_name: csvClaim['Provider__descr'] || 'N/A', // Note: double underscore in CSV
          provider_type: csvClaim['Provider type'] || 'N/A', // Note: space in column name
          
          // Benefit fields - using exact CSV column names
          benefit_code: csvClaim['Benefit_head_code'] || 'N/A',
          benefit_description: csvClaim['Benefit_head_descr'] || 'N/A',
          
          // Medical fields - using exact CSV column names
          procedure_code: csvClaim['Procedure_code'] || 'N/A',
          procedure_description: csvClaim['Procedure_descr'] || 'N/A',
          diagnosis_code: csvClaim['diagnosis_code'] || 'N/A',
          diagnosis_name: csvClaim['Diagnostic name'] || 'N/A', // Note: space in column name
          
          // Date fields - using exact CSV column names
          service_date: csvClaim['Treatment from date'] || 'N/A', // Note: space in column name
          treatment_to_date: csvClaim['Treatment_to_date'] || 'N/A',
          invoice_date: csvClaim['Claim_invoice_date'] || 'N/A',
          
          // Other fields - using exact CSV column names
          payee_type: csvClaim['Payee_type'] || 'N/A',
          payee_rule_code: csvClaim['Payee_rule_code'] || 'N/A',
          payee_rule_description: csvClaim['Payee_rule_descr'] || 'N/A',
          incident_count: parseInt(csvClaim['Incident_count']) || 0,
          member_id: csvClaim['Member_ID'] || 'N/A',
          provider_id: csvClaim['Provider_ID'] || 'N/A',
          gender: csvClaim['Gender'] || 'N/A',
          age: parseInt(csvClaim['Age']) || 0,
          specialisation_code: csvClaim['specialisation_code'] || 'N/A',
          treatment_country: csvClaim['Treatment_Country'] || 'N/A',
          invoice_reference: csvClaim['Invoice_No_Reference'] || 'N/A',
          
          // Additional fields from CSV that might be useful
          provider_type_code: csvClaim['Provider_type_code'] || 'N/A',
          document_image_id: csvClaim['Document_image_ID'] || 'N/A',
          claim_hash_total: csvClaim['Claim_hash_total'] || 'N/A'
        };
      }
      
      // If no CSV match found, return original anomaly data
      return anomaly;
    });
  };

  const handleScenarioClick = (scenarioKey: string, scenarioName: string) => {
    setSelectedScenario(scenarioKey);
    setShowScenarioDetails(true);
  };

  // Convert anomalies to alerts format
  const recentAlerts = anomaliesData.slice(0, 4).map((anomaly, index) => ({
    id: index + 1,
    type: anomaly.type,
    message: anomaly.description,
    severity: anomaly.severity.toLowerCase(),
    time: 'Recently detected',
    scenario: anomaly.type
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor fraud, waste, and abuse patterns across your healthcare network</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>Export Report</Button>
          <Button className="bg-blue-600 hover:bg-blue-700">Generate Alert</Button>
        </div>
      </div>

      
      {/* Scenario Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle>Fraud Detection Scenario Results</CardTitle>
          <CardDescription>Breakdown of anomalies detected by each fraud detection scenario</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Scenario Performance Chart */}
          <div className="h-80 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Performance Overview</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }} 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis tickFormatter={(value) => value.toLocaleString()} />
                <Bar dataKey="count" fill="#3B82F6" name="Claims Flagged" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Fraud Detection Scenario Results - Clean Display */}
          {scenarioResults && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {Object.entries(scenarioResults)
                .filter(([key, data]: [string, any]) => data.count > 0) // Filter out scenarios with zero count
                .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
                .map(([key, data]: [string, any]) => (
                <div 
                  key={key} 
                  className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] hover:border-blue-300 transition-all duration-300 relative overflow-hidden"
                  onClick={() => handleScenarioClick(key, data.name)}
                >
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-blue-700/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-blue-900 group-hover:text-blue-800 transition-colors">
                        {data.name}
                      </h4>
                      <Badge variant="outline" className="text-xs bg-white text-blue-700 border-blue-300 group-hover:bg-blue-50">
                        Python Rules
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-4xl font-bold text-blue-700 group-hover:text-blue-800 transition-colors">
                        {summary?.total_claims_analyzed > 0
                          ? `${((data.count / summary.total_claims_analyzed) * 100).toFixed(2)}%`
                          : data.count.toLocaleString()}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        Claims Flagged
                        {summary?.total_claims_analyzed > 0 && (
                          <span className="text-xs text-blue-500 ml-2">
                            ({data.count.toLocaleString()})
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-xs text-blue-500">
                          Risk Level: {key === 'scenario1' || key === 'scenario3' ? 'High' : key === 'scenario2' ? 'Critical' : 'Medium'}
                        </div>
                        <div className="text-xs text-blue-500">
                          Est. Amount: {formatCurrency(data.count * (key === 'scenario1' ? 15000 : key === 'scenario2' ? 25000 : key === 'scenario3' ? 35000 : 8000))}
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t border-blue-200/50">
                        <div className="text-xs text-blue-600 font-medium flex items-center gap-2 group-hover:text-blue-700 transition-colors">
                          <Eye className="w-4 h-4" />
                          Click to view detailed analysis
                          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Professional Scenario Details Modal */}
      {showScenarioDetails && selectedScenario && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowScenarioDetails(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {scenarioResults?.[selectedScenario]?.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Detailed analysis of {scenarioResults?.[selectedScenario]?.count.toLocaleString()} flagged claims
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowScenarioDetails(false)}
                  className="hover:bg-white/50"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {(() => {
                const scenarioClaims = getClaimsForScenario(selectedScenario);
                return (
                  <div className="p-6">
                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-blue-600 rounded-lg">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                          <Badge variant="secondary" className="text-xs">Sample</Badge>
                        </div>
                        <div className="text-3xl font-bold text-blue-700 mb-1">
                          {scenarioClaims.length}
                        </div>
                        <div className="text-sm text-blue-600 font-medium">Claims Available</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-green-600 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-white" />
                          </div>
                          <Badge variant="secondary" className="text-xs">Total</Badge>
                        </div>
                        <div className="text-3xl font-bold text-green-700 mb-1">
                          {scenarioResults?.[selectedScenario]?.count.toLocaleString()}
                        </div>
                        <div className="text-sm text-green-600 font-medium">Claims Flagged</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="p-2 bg-orange-600 rounded-lg">
                            <DollarSign className="w-4 h-4 text-white" />
                          </div>
                          <Badge variant="secondary" className="text-xs">Risk</Badge>
                        </div>
                        <div className="text-3xl font-bold text-orange-700 mb-1">
                          {formatCurrency(scenarioClaims.reduce((sum, claim) => sum + (claim.gross_total_amount || claim.billed_amount || 0), 0))}
                        </div>
                        <div className="text-sm text-orange-600 font-medium">Amount at Risk</div>
                      </div>
                    </div>

                    {/* Claims List */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-gray-900">Flagged Claims Details</h3>
                        <Badge variant="outline" className="text-sm">
                          Showing {scenarioClaims.length} of {scenarioResults?.[selectedScenario]?.count.toLocaleString()}
                        </Badge>
                      </div>
                      
                      {scenarioClaims.length > 0 ? (
                        <div className="space-y-6">
                          {scenarioClaims.map((claim, index) => (
                            <div key={claim.id} className="bg-white border rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full text-sm font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-bold text-gray-900">
                                      {claim.claim_id}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">{claim.description}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className={`${claim.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                    {claim.severity} Risk
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {claim.method}
                                  </Badge>
                                </div>
                              </div>
                              
                              {/* Main Details Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                                {/* Financial Information */}
                                <div className="space-y-4">
                                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                                    💰 Financial Details
                                  </h5>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-xs text-gray-500">Gross Total Amount</div>
                                      <div className="text-sm font-semibold text-green-700">
                                        {claim.gross_total_amount && claim.gross_total_amount !== 0 ? formatCurrency(Number(claim.gross_total_amount)) : 'Not Available'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Paid Amount</div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {claim.paid_amount && claim.paid_amount !== 0 ? formatCurrency(Number(claim.paid_amount)) : 'Not Available'}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Currency</div>
                                      <div className="text-sm text-gray-900">
                                        {(claim.claimed_currency && claim.claimed_currency !== 'N/A') ? claim.claimed_currency : 'N/A'} → {(claim.payment_currency && claim.payment_currency !== 'N/A') ? claim.payment_currency : 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Provider & Service Information */}
                                <div className="space-y-4">
                                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                                    🏥 Provider & Service
                                  </h5>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-xs text-gray-500">Provider Name</div>
                                      <div className="text-sm font-medium text-gray-900">{(claim.provider_name && claim.provider_name !== 'N/A') ? claim.provider_name : 'Not Available'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Provider Country</div>
                                      <div className="text-sm text-gray-900">{(claim.provider_country && claim.provider_country !== 'N/A') ? claim.provider_country : 'Not Available'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Treatment Date</div>
                                      <div className="text-sm text-gray-900">{(claim.service_date && claim.service_date !== 'N/A') ? claim.service_date : 'Not Available'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Provider Type</div>
                                      <div className="text-sm text-gray-900">{(claim.provider_type && claim.provider_type !== 'N/A') ? claim.provider_type : 'Not Available'}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Medical & Benefit Information */}
                                <div className="space-y-4">
                                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">
                                    🩺 Medical & Benefits
                                  </h5>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-xs text-gray-500">Benefit Code</div>
                                      <div className="text-sm font-mono text-gray-900">{(claim.benefit_code && claim.benefit_code !== 'N/A') ? claim.benefit_code : 'Not Available'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Benefit Description</div>
                                      <div className="text-sm text-gray-900">{(claim.benefit_description && claim.benefit_description !== 'N/A') ? claim.benefit_description : 'Not Available'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Procedure Code</div>
                                      <div className="text-sm font-mono text-gray-900">{(claim.procedure_code && claim.procedure_code !== 'N/A') ? claim.procedure_code : 'Not Available'}</div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500">Diagnosis Name</div>
                                      <div className="text-sm text-gray-900">{(claim.diagnosis_name && claim.diagnosis_name !== 'N/A') ? claim.diagnosis_name : 'Not Available'}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Additional Details */}
                              <div className="mt-6 pt-4 border-t border-gray-100">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-500">Member ID:</span>
                                    <span className="ml-1 font-medium">{(claim.member_id && claim.member_id !== 'N/A') ? claim.member_id : 'Not Available'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Age/Gender:</span>
                                    <span className="ml-1 font-medium">{(claim.age && claim.age !== 0) ? claim.age : 'N/A'}/{(claim.gender && claim.gender !== 'N/A') ? claim.gender : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Invoice Ref:</span>
                                    <span className="ml-1 font-medium">{(claim.invoice_reference && claim.invoice_reference !== 'N/A') ? claim.invoice_reference : 'Not Available'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Treatment Country:</span>
                                    <span className="ml-1 font-medium">{(claim.treatment_country && claim.treatment_country !== 'N/A') ? claim.treatment_country : 'Not Available'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Additional CSV Details Section */}
                              <div className="mt-6 pt-4 border-t border-gray-100">
                                <h6 className="text-sm font-semibold text-gray-700 mb-3">Additional Details from CSV</h6>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                  <div>
                                    <span className="text-gray-500">Provider Type Code:</span>
                                    <span className="ml-1 font-medium">{(claim.provider_type_code && claim.provider_type_code !== 'N/A') ? claim.provider_type_code : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Specialisation:</span>
                                    <span className="ml-1 font-medium">{(claim.specialisation_code && claim.specialisation_code !== 'N/A') ? claim.specialisation_code : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Incident Count:</span>
                                    <span className="ml-1 font-medium">{claim.incident_count || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Payee Type:</span>
                                    <span className="ml-1 font-medium">{(claim.payee_type && claim.payee_type !== 'N/A') ? claim.payee_type : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Payee Rule:</span>
                                    <span className="ml-1 font-medium">{(claim.payee_rule_code && claim.payee_rule_code !== 'N/A') ? claim.payee_rule_code : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Document ID:</span>
                                    <span className="ml-1 font-medium">{(claim.document_image_id && claim.document_image_id !== 'N/A') ? claim.document_image_id : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Debug Section - Show available CSV fields */}
                              {claim.csvData && (
                                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-gray-600 font-medium">
                                      Debug: Available CSV Fields (Click to expand)
                                    </summary>
                                    <div className="mt-2 max-h-32 overflow-y-auto">
                                      <pre className="text-xs text-gray-700">
                                        {JSON.stringify(claim.csvData, null, 2)}
                                      </pre>
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h4 className="text-lg font-medium text-gray-900 mb-2">No Sample Claims Available</h4>
                          <p className="text-gray-600">
                            While {scenarioResults?.[selectedScenario]?.count.toLocaleString()} claims were flagged by this scenario,
                            no sample data is available in the current dataset.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Information Note */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-1 bg-blue-600 rounded-full mt-0.5">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 mb-1">Analysis Summary</h4>
                          <p className="text-sm text-blue-700">
                            This scenario identified <strong>{scenarioResults?.[selectedScenario]?.count.toLocaleString()} total claims</strong> as potentially fraudulent. 
                            The sample above shows {scenarioClaims.length} claims from your current dataset. 
                            For comprehensive investigation and reporting, use the Claims Analysis section.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">ESC</kbd> or click outside to close
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowScenarioDetails(false)}
                  className="hover:bg-gray-100"
                >
                  Close
                </Button>
                <Link to="/claims">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Full Claims Analysis
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}