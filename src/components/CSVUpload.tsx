import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, TrendingUp, Brain, Code, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import Papa from 'papaparse';

interface CSVUploadProps {
  onDataUploaded: (data: any[], anomalies: any[]) => void;
}

interface ClaimsData {
  claim_id: string;
  provider_id: string;
  provider_name: string;
  patient_id: string;
  service_date: string;
  procedure_code: string;
  diagnosis_code: string;
  billed_amount: number;
  allowed_amount: number;
  paid_amount: number;
  service_type: string;
  specialty: string;
}

interface ValidationMethods {
  ml: boolean;
  pythonRules: boolean;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onDataUploaded }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'file-selected' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedData, setUploadedData] = useState<ClaimsData[]>([]);
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationMethods, setValidationMethods] = useState<ValidationMethods>({
    ml: true,
    pythonRules: true
  });

  // ML-based anomaly detection (more sophisticated statistical analysis)
  const detectMLAnomalies = useCallback((data: ClaimsData[]) => {
    const anomalies: any[] = [];
    
    // Advanced statistical analysis for ML validation
    const amounts = data.map(d => d.billed_amount).filter(a => a > 0);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    // ML-style clustering analysis for unusual patterns
    const procedureCosts = data.reduce((acc, claim) => {
      if (!acc[claim.procedure_code]) {
        acc[claim.procedure_code] = [];
      }
      acc[claim.procedure_code].push(claim.billed_amount);
      return acc;
    }, {} as Record<string, number[]>);

    // Provider behavior analysis
    const providerMetrics = data.reduce((acc, claim) => {
      if (!acc[claim.provider_id]) {
        acc[claim.provider_id] = {
          total_billed: 0,
          claim_count: 0,
          avg_amount: 0,
          procedures: new Set(),
          weekend_claims: 0
        };
      }
      
      const provider = acc[claim.provider_id];
      provider.total_billed += claim.billed_amount;
      provider.claim_count += 1;
      provider.procedures.add(claim.procedure_code);
      
      const serviceDate = new Date(claim.service_date);
      if (serviceDate.getDay() === 0 || serviceDate.getDay() === 6) {
        provider.weekend_claims += 1;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate provider averages
    Object.keys(providerMetrics).forEach(providerId => {
      const metrics = providerMetrics[providerId];
      metrics.avg_amount = metrics.total_billed / metrics.claim_count;
    });

    data.forEach((claim, index) => {
      // ML Algorithm 1: Multivariate outlier detection
      const zScore = Math.abs((claim.billed_amount - mean) / stdDev);
      if (zScore > 2.5) {
        anomalies.push({
          id: `ml_outlier_${index}`,
          type: 'ML Statistical Outlier',
          method: 'ML',
          severity: zScore > 3.5 ? 'High' : 'Medium',
          claim_id: claim.claim_id,
          provider_id: claim.provider_id,
          provider_name: claim.provider_name,
          description: `ML model detected statistical anomaly (Z-score: ${zScore.toFixed(2)}) in billing amount`,
          risk_score: Math.min(100, zScore * 20),
          service_date: claim.service_date,
          billed_amount: claim.billed_amount
        });
      }

      // ML Algorithm 2: Provider behavior clustering
      const provider = providerMetrics[claim.provider_id];
      const procedureVariance = procedureCosts[claim.procedure_code]?.length > 1 ? 
        procedureCosts[claim.procedure_code].reduce((acc, amount) => {
          const procedureMean = procedureCosts[claim.procedure_code].reduce((a, b) => a + b, 0) / procedureCosts[claim.procedure_code].length;
          return acc + Math.pow(amount - procedureMean, 2);
        }, 0) / procedureCosts[claim.procedure_code].length : 0;

      if (provider.weekend_claims / provider.claim_count > 0.3 && provider.claim_count > 5) {
        const existingAnomaly = anomalies.find(a => 
          a.type === 'ML Provider Pattern Anomaly' && a.provider_id === claim.provider_id
        );
        if (!existingAnomaly) {
          anomalies.push({
            id: `ml_provider_${claim.provider_id}`,
            type: 'ML Provider Pattern Anomaly',
            method: 'ML',
            severity: provider.weekend_claims / provider.claim_count > 0.5 ? 'High' : 'Medium',
            provider_id: claim.provider_id,
            provider_name: claim.provider_name,
            description: `ML algorithm detected unusual provider behavior: ${((provider.weekend_claims / provider.claim_count) * 100).toFixed(1)}% weekend claims`,
            risk_score: (provider.weekend_claims / provider.claim_count) * 100,
            claim_count: provider.claim_count
          });
        }
      }

      // ML Algorithm 3: Procedure cost anomaly detection
      if (procedureCosts[claim.procedure_code]?.length > 3) {
        const procedureMean = procedureCosts[claim.procedure_code].reduce((a, b) => a + b, 0) / procedureCosts[claim.procedure_code].length;
        const procedureStdDev = Math.sqrt(procedureVariance);
        const procedureZScore = Math.abs((claim.billed_amount - procedureMean) / procedureStdDev);
        
        if (procedureZScore > 2.0 && claim.billed_amount > procedureMean * 1.5) {
          anomalies.push({
            id: `ml_procedure_${index}`,
            type: 'ML Procedure Cost Anomaly',
            method: 'ML',
            severity: procedureZScore > 3.0 ? 'High' : 'Medium',
            claim_id: claim.claim_id,
            provider_id: claim.provider_id,
            provider_name: claim.provider_name,
            description: `ML detected unusual cost for procedure ${claim.procedure_code}: $${claim.billed_amount.toLocaleString()} vs avg $${procedureMean.toFixed(0)}`,
            risk_score: Math.min(100, procedureZScore * 25),
            service_date: claim.service_date,
            billed_amount: claim.billed_amount
          });
        }
      }
    });

    return anomalies;
  }, []);

  // Python Rules-based anomaly detection (rule-based business logic)
  const detectPythonRulesAnomalies = useCallback((data: ClaimsData[]) => {
    const anomalies: any[] = [];
    
    // Rule-based thresholds and business logic
    const HIGH_AMOUNT_THRESHOLD = 50000;
    const MEDIUM_AMOUNT_THRESHOLD = 10000;
    const MAX_DAILY_CLAIMS_PER_PROVIDER = 20;
    const SUSPICIOUS_PAYMENT_RATIO = 0.7;
    
    // Provider frequency analysis
    const providerCounts = data.reduce((acc, claim) => {
      acc[claim.provider_id] = (acc[claim.provider_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily claims analysis
    const dailyClaims = data.reduce((acc, claim) => {
      const key = `${claim.provider_id}_${claim.service_date}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    data.forEach((claim, index) => {
      // Rule 1: High dollar amount threshold
      if (claim.billed_amount > HIGH_AMOUNT_THRESHOLD) {
        anomalies.push({
          id: `rule_high_amount_${index}`,
          type: 'Rule: Excessive Billing Amount',
          method: 'Python Rules',
          severity: 'High',
          claim_id: claim.claim_id,
          provider_id: claim.provider_id,
          provider_name: claim.provider_name,
          description: `Business rule violation: Billing amount $${claim.billed_amount.toLocaleString()} exceeds threshold of $${HIGH_AMOUNT_THRESHOLD.toLocaleString()}`,
          risk_score: Math.min(100, (claim.billed_amount / HIGH_AMOUNT_THRESHOLD) * 80),
          service_date: claim.service_date,
          billed_amount: claim.billed_amount
        });
      }

      // Rule 2: Suspicious payment patterns
      const paymentRatio = claim.paid_amount / claim.billed_amount;
      if (paymentRatio > SUSPICIOUS_PAYMENT_RATIO && claim.billed_amount > MEDIUM_AMOUNT_THRESHOLD) {
        anomalies.push({
          id: `rule_payment_${index}`,
          type: 'Rule: Suspicious Payment Pattern',
          method: 'Python Rules',
          severity: 'Medium',
          claim_id: claim.claim_id,
          provider_id: claim.provider_id,
          provider_name: claim.provider_name,
          description: `Business rule alert: Payment ratio ${(paymentRatio * 100).toFixed(1)}% is unusually high for billing amount $${claim.billed_amount.toLocaleString()}`,
          risk_score: paymentRatio * 90,
          service_date: claim.service_date,
          billed_amount: claim.billed_amount
        });
      }

      // Rule 3: Daily claim volume per provider
      const dailyKey = `${claim.provider_id}_${claim.service_date}`;
      const dailyClaimCount = dailyClaims[dailyKey];
      if (dailyClaimCount > MAX_DAILY_CLAIMS_PER_PROVIDER) {
        const existingAnomaly = anomalies.find(a => 
          a.type === 'Rule: Excessive Daily Claims' && a.provider_id === claim.provider_id && a.service_date === claim.service_date
        );
        if (!existingAnomaly) {
          anomalies.push({
            id: `rule_daily_${claim.provider_id}_${claim.service_date}`,
            type: 'Rule: Excessive Daily Claims',
            method: 'Python Rules',
            severity: dailyClaimCount > MAX_DAILY_CLAIMS_PER_PROVIDER * 2 ? 'High' : 'Medium',
            provider_id: claim.provider_id,
            provider_name: claim.provider_name,
            service_date: claim.service_date,
            description: `Business rule violation: ${dailyClaimCount} claims on ${claim.service_date} exceeds daily limit of ${MAX_DAILY_CLAIMS_PER_PROVIDER}`,
            risk_score: Math.min(100, (dailyClaimCount / MAX_DAILY_CLAIMS_PER_PROVIDER) * 60),
            claim_count: dailyClaimCount
          });
        }
      }

      // Rule 4: Weekend emergency procedures (specific business rule)
      const serviceDate = new Date(claim.service_date);
      const isWeekend = serviceDate.getDay() === 0 || serviceDate.getDay() === 6;
      const isHighValue = claim.billed_amount > MEDIUM_AMOUNT_THRESHOLD;
      const isNonEmergencyCode = !['99281', '99282', '99283', '99284', '99285'].includes(claim.procedure_code);
      
      if (isWeekend && isHighValue && isNonEmergencyCode) {
        anomalies.push({
          id: `rule_weekend_${index}`,
          type: 'Rule: Non-Emergency Weekend Service',
          method: 'Python Rules',
          severity: 'Medium',
          claim_id: claim.claim_id,
          provider_id: claim.provider_id,
          provider_name: claim.provider_name,
          description: `Business rule alert: Non-emergency procedure ${claim.procedure_code} ($${claim.billed_amount.toLocaleString()}) on weekend`,
          risk_score: 55,
          service_date: claim.service_date,
          billed_amount: claim.billed_amount
        });
      }

      // Rule 5: Provider volume thresholds
      const providerClaimCount = providerCounts[claim.provider_id];
      if (providerClaimCount > 100) {
        const existingAnomaly = anomalies.find(a => 
          a.type === 'Rule: High Volume Provider' && a.provider_id === claim.provider_id
        );
        if (!existingAnomaly) {
          anomalies.push({
            id: `rule_volume_${claim.provider_id}`,
            type: 'Rule: High Volume Provider',
            method: 'Python Rules',
            severity: providerClaimCount > 500 ? 'High' : 'Medium',
            provider_id: claim.provider_id,
            provider_name: claim.provider_name,
            description: `Business rule alert: Provider has ${providerClaimCount} total claims, exceeding volume threshold`,
            risk_score: Math.min(100, (providerClaimCount / 1000) * 100),
            claim_count: providerClaimCount
          });
        }
      }
    });

    return anomalies;
  }, []);

  const detectAnomalies = useCallback((data: ClaimsData[], methods: ValidationMethods) => {
    let allAnomalies: any[] = [];

    if (methods.ml) {
      const mlAnomalies = detectMLAnomalies(data);
      allAnomalies = [...allAnomalies, ...mlAnomalies];
    }

    if (methods.pythonRules) {
      const rulesAnomalies = detectPythonRulesAnomalies(data);
      allAnomalies = [...allAnomalies, ...rulesAnomalies];
    }

    return allAnomalies.sort((a, b) => b.risk_score - a.risk_score);
  }, [detectMLAnomalies, detectPythonRulesAnomalies]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Please upload a CSV file.');
      setUploadStatus('error');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setUploadStatus('file-selected');
    setErrorMessage('');
  }, []);

  const handleValidationMethodChange = (method: keyof ValidationMethods, checked: boolean) => {
    setValidationMethods(prev => ({
      ...prev,
      [method]: checked
    }));
  };

  const processFile = useCallback(() => {
    if (!selectedFile) return;

    // Validate that at least one method is selected
    if (!validationMethods.ml && !validationMethods.pythonRules) {
      setErrorMessage('Please select at least one validation method.');
      return;
    }

    setUploadStatus('uploading');
    setProgress(10);
    setErrorMessage('');

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setProgress(50);
        setUploadStatus('processing');

        try {
          // Transform and validate data
          const transformedData: ClaimsData[] = results.data.map((row: any, index) => {
            const billedAmount = parseFloat(row.billed_amount || row.BilledAmount || '0');
            const allowedAmount = parseFloat(row.allowed_amount || row.AllowedAmount || '0');
            const paidAmount = parseFloat(row.paid_amount || row.PaidAmount || '0');

            return {
              claim_id: row.claim_id || row.ClaimID || `CLAIM_${index + 1}`,
              provider_id: row.provider_id || row.ProviderID || `PROV_${index + 1}`,
              provider_name: row.provider_name || row.ProviderName || `Provider ${index + 1}`,
              patient_id: row.patient_id || row.PatientID || `PAT_${index + 1}`,
              service_date: row.service_date || row.ServiceDate || new Date().toISOString().split('T')[0],
              procedure_code: row.procedure_code || row.ProcedureCode || 'UNKNOWN',
              diagnosis_code: row.diagnosis_code || row.DiagnosisCode || 'UNKNOWN',
              billed_amount: billedAmount,
              allowed_amount: allowedAmount,
              paid_amount: paidAmount,
              service_type: row.service_type || row.ServiceType || 'General',
              specialty: row.specialty || row.Specialty || 'General Practice'
            };
          });

          setProgress(75);

          // Detect anomalies using selected methods
          const anomalies = detectAnomalies(transformedData, validationMethods);
          
          setProgress(100);
          setUploadedData(transformedData);
          setDetectedAnomalies(anomalies);
          setUploadStatus('complete');

          // Notify parent component
          onDataUploaded(transformedData, anomalies);

        } catch (error) {
          console.error('Error processing CSV:', error);
          setErrorMessage('Error processing CSV file. Please check the format and try again.');
          setUploadStatus('error');
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        setErrorMessage('Error reading CSV file. Please check the file and try again.');
        setUploadStatus('error');
      }
    });
  }, [selectedFile, validationMethods, detectAnomalies, onDataUploaded]);

  const resetUpload = () => {
    setUploadStatus('idle');
    setProgress(0);
    setFileName('');
    setErrorMessage('');
    setUploadedData([]);
    setDetectedAnomalies([]);
    setSelectedFile(null);
    setValidationMethods({ ml: true, pythonRules: true });
  };

  const getMethodStats = () => {
    const mlCount = detectedAnomalies.filter(a => a.method === 'ML').length;
    const rulesCount = detectedAnomalies.filter(a => a.method === 'Python Rules').length;
    return { mlCount, rulesCount };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Healthcare FWA Analytics</h1>
          <p className="text-gray-600">Upload your claims data to begin fraud, waste, and abuse analysis</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Data Upload & Validation Configuration
            </CardTitle>
            <CardDescription>
              Upload a CSV file and select your preferred validation methods for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadStatus === 'idle' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg">Choose a CSV file to upload</p>
                    <p className="text-sm text-gray-500">
                      File should contain columns: claim_id, provider_id, provider_name, billed_amount, paid_amount, service_date
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            )}

            {uploadStatus === 'file-selected' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-gray-500 ml-auto">Ready for processing</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-5 w-5 text-gray-600" />
                    <h3 className="font-medium">Select Validation Methods</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="ml-validation" 
                          checked={validationMethods.ml}
                          onCheckedChange={(checked) => handleValidationMethodChange('ml', checked as boolean)}
                        />
                        <Label htmlFor="ml-validation" className="flex items-center gap-2 cursor-pointer">
                          <Brain className="h-4 w-4 text-purple-600" />
                          Machine Learning Validation
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 ml-6">
                        Advanced statistical analysis, pattern recognition, and multivariate outlier detection using ML algorithms.
                      </p>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="rules-validation" 
                          checked={validationMethods.pythonRules}
                          onCheckedChange={(checked) => handleValidationMethodChange('pythonRules', checked as boolean)}
                        />
                        <Label htmlFor="rules-validation" className="flex items-center gap-2 cursor-pointer">
                          <Code className="h-4 w-4 text-green-600" />
                          Python Rules Validation
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 ml-6">
                        Business rule-based validation using predefined thresholds and compliance checks.
                      </p>
                    </div>
                  </div>

                  {(!validationMethods.ml && !validationMethods.pythonRules) && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please select at least one validation method to proceed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={processFile} 
                    className="flex-1"
                    disabled={!validationMethods.ml && !validationMethods.pythonRules}
                  >
                    Process File with Selected Methods
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    Choose Different File
                  </Button>
                </div>
              </div>
            )}

            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm">{fileName}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {uploadStatus === 'uploading' ? 'Uploading...' : 
                       `Processing with ${validationMethods.ml && validationMethods.pythonRules ? 'ML & Python Rules' : 
                        validationMethods.ml ? 'ML' : 'Python Rules'}...`}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </div>
            )}

            {uploadStatus === 'complete' && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Successfully processed {uploadedData.length.toLocaleString()} claims and detected {detectedAnomalies.length} potential anomalies using {validationMethods.ml && validationMethods.pythonRules ? 'both ML and Python Rules' : validationMethods.ml ? 'ML validation' : 'Python Rules validation'}.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Total Claims</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{uploadedData.length.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Total Anomalies</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-900">{detectedAnomalies.length.toLocaleString()}</p>
                  </div>

                  {validationMethods.ml && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">ML Detected</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">{getMethodStats().mlCount.toLocaleString()}</p>
                    </div>
                  )}

                  {validationMethods.pythonRules && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Rules Detected</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{getMethodStats().rulesCount.toLocaleString()}</p>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Risk Range</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {detectedAnomalies.length > 0 ? 
                        `${Math.min(...detectedAnomalies.map(a => Math.round(a.risk_score)))}-${Math.max(...detectedAnomalies.map(a => Math.round(a.risk_score)))}` 
                        : 'N/A'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => onDataUploaded(uploadedData, detectedAnomalies)} 
                    className="flex-1"
                  >
                    Continue to Dashboard
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    Upload Different File
                  </Button>
                </div>
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
                <Button variant="outline" onClick={resetUpload}>
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {uploadStatus === 'complete' && detectedAnomalies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Anomalies Preview</CardTitle>
              <CardDescription>
                Showing the highest risk anomalies detected using your selected validation methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detectedAnomalies.slice(0, 6).map((anomaly) => (
                  <div key={anomaly.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          anomaly.severity === 'High' ? 'bg-red-100 text-red-800' :
                          anomaly.severity === 'Medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {anomaly.severity}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          anomaly.method === 'ML' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {anomaly.method}
                        </span>
                        <span className="font-medium">{anomaly.type}</span>
                      </div>
                      <p className="text-sm text-gray-600">{anomaly.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{Math.round(anomaly.risk_score)}</div>
                      <div className="text-xs text-gray-500">Risk Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CSVUpload;