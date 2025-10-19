import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, TrendingUp, Brain, Code, Settings, ArrowLeft, Check, X, AlertTriangle, BarChart3, Calendar, DollarSign, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
// Import API configuration
import API_CONFIG from '../config/api';
import AnalysisLoadingPage from './AnalysisLoadingPage';

interface CompactCSVUploadProps {
  onDataUploaded: (data: any[], anomalies: any[], scenarioResults?: any, summary?: any) => void;
  onBack: () => void;
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

const CompactCSVUpload: React.FC<CompactCSVUploadProps> = ({ onDataUploaded, onBack }) => {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'file-selected' | 'field-review' | 'descriptive-analysis' | 'uploading' | 'processing' | 'analyzing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedData, setUploadedData] = useState<ClaimsData[]>([]);
  const [detectedAnomalies, setDetectedAnomalies] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<any[]>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [approvedMapping, setApprovedMapping] = useState<Record<string, string> | null>(null);
  const [multiMappings, setMultiMappings] = useState<Record<string, string[]>>({});
  const [validationMethods, setValidationMethods] = useState<ValidationMethods>({
    ml: true,
    pythonRules: true
  });

  // Required fields configuration
  const requiredFields = [
    // Basic Claim Information
    { name: 'Claim ID', aliases: ['claim_id', 'claimid', 'claim', 'id', 'claim_number', 'claimnumber'], category: 'Basic Information' },
    { name: 'Member ID', aliases: ['member_id', 'memberid', 'patient_id', 'patientid', 'member', 'patient'], category: 'Basic Information' },
    { name: 'Provider ID', aliases: ['provider_id', 'providerid', 'provider', 'prov_id', 'provid'], category: 'Provider Information' },
    { name: 'Provider type', aliases: ['provider_type', 'providertype', 'prov_type', 'type', 'specialty'], category: 'Provider Information' },
    
    // Invoice and Billing
    { name: 'Claim invoice_no', aliases: ['claim_invoice_no', 'invoice_no', 'invoice', 'claim_invoice', 'invoiceno'], category: 'Billing Information' },
    { name: 'Claim_invoice line_no', aliases: ['claim_invoice_line_no', 'line_no', 'lineno', 'line', 'claim_line'], category: 'Billing Information' },
    { name: 'Invoice No Reference', aliases: ['invoice_no_reference', 'reference', 'ref', 'invoice_ref', 'invoiceref'], category: 'Billing Information' },
    { name: 'Claim_version', aliases: ['claim_version', 'claimversion', 'version', 'claim_ver'], category: 'Basic Information' },
    { name: 'Latest_claim_version_IND', aliases: ['latest_claim_version_ind', 'latest_version', 'is_latest', 'latest_ind'], category: 'Basic Information' },
    { name: 'Claim status_code', aliases: ['claim_status_code', 'status_code', 'claim_status', 'status'], category: 'Claim Status' },
    { name: 'Incident count', aliases: ['incident_count', 'incidentcount', 'incident', 'incidents'], category: 'Basic Information' },
    
    // Medical Codes
    { name: 'Diagnostic_code (ICD-10)', aliases: ['diagnostic_code', 'icd10', 'icd_10', 'diagnosis_code', 'diag_code'], category: 'Medical Codes' },
    { name: 'Procedure_code (CPT codes)', aliases: ['procedure_code', 'cpt_code', 'cpt', 'proc_code', 'procedure'], category: 'Medical Codes' },
    { name: 'NDC_code', aliases: ['ndc_code', 'ndc', 'drug_code', 'medication_code'], category: 'Medical Codes' },
    
    // Demographics
    { name: 'Age', aliases: ['age', 'patient_age', 'member_age'], category: 'Demographics' },
    { name: 'Gender', aliases: ['gender', 'sex', 'patient_gender', 'member_gender'], category: 'Demographics' },
    { name: 'Nationality code', aliases: ['nationality_code', 'nationality', 'country_code', 'nat_code'], category: 'Demographics' },
    
    // Dates
    { name: 'Claim_invoice_date', aliases: ['claim_invoice_date', 'invoice_date', 'claim_date', 'service_date'], category: 'Dates' },
    { name: 'Admission date', aliases: ['admission_date', 'admit_date', 'admission_dt', 'admit_dt'], category: 'Dates' },
    { name: 'Discharge date', aliases: ['discharge_date', 'discharge_dt', 'disch_date', 'disch_dt'], category: 'Dates' },
    { name: 'Treatment from date', aliases: ['treatment_from_date', 'treatment_start', 'treat_from', 'from_date'], category: 'Dates' },
    { name: 'Treatment to date', aliases: ['treatment_to_date', 'treatment_end', 'treat_to', 'to_date'], category: 'Dates' },
    { name: 'claim status datetime', aliases: ['claim_status_datetime', 'status_datetime', 'claim_status_dt'], category: 'Dates' },
    
    // Service Information
    { name: 'LOS (Length_of_stay)', aliases: ['los', 'length_of_stay', 'stay_length', 'length_stay'], category: 'Service Information' },
    { name: 'POS (Place of service)', aliases: ['pos', 'place_of_service', 'service_place', 'place_service'], category: 'Service Information' },
    { name: 'Provider_country_code', aliases: ['provider_country_code', 'provider_country', 'prov_country'], category: 'Provider Information' },
    { name: 'Coverage type (Inpatient, Outpatient, Pharmacy, etc.)', aliases: ['coverage_type', 'service_type', 'care_type'], category: 'Service Information' },
    { name: 'Facility_type (Clinic, Hospital, Lab)', aliases: ['facility_type', 'facility', 'provider_facility', 'facility_category'], category: 'Provider Information' },
    
    // Financial Information
    { name: 'Paid amount', aliases: ['paid_amount', 'paidamount', 'payment', 'paid'], category: 'Financial Information' },
    { name: 'billed_amount', aliases: ['billed_amount', 'billedamount', 'amount', 'bill_amount', 'billing'], category: 'Financial Information' },
    { name: 'allowed_amount', aliases: ['allowed_amount', 'allowedamount', 'allowed', 'approved_amount'], category: 'Financial Information' },
    { name: 'Claimed_currency_code', aliases: ['claimed_currency_code', 'claim_currency', 'currency_code'], category: 'Financial Information' },
    { name: 'Payment currency code', aliases: ['payment_currency_code', 'payment_currency', 'pay_currency'], category: 'Financial Information' },
    { name: 'Base currency code', aliases: ['base_currency_code', 'base_currency', 'base_curr'], category: 'Financial Information' },
    { name: 'Claim invoice gross total amount', aliases: ['claim_invoice_gross_total', 'gross_total', 'total_amount'], category: 'Financial Information' },
    { name: 'Conversion_rate', aliases: ['conversion_rate', 'exchange_rate', 'curr_rate'], category: 'Financial Information' },
    { name: 'deductible_remaining', aliases: ['deductible_remaining', 'remaining_deductible', 'deductible_left'], category: 'Financial Information' },
    { name: 'copay amount', aliases: ['copay_amount', 'copay', 'co_pay', 'copayment'], category: 'Financial Information' },
    { name: 'coinsurance pct', aliases: ['coinsurance_pct', 'coinsurance', 'coin_pct', 'coinsurance_percentage'], category: 'Financial Information' },
    { name: 'Discount Amount or Subsidy Amount', aliases: ['discount_amount', 'subsidy_amount', 'discount', 'subsidy'], category: 'Financial Information' },
    
    // Authorization and Referrals
    { name: 'prior auth required flag', aliases: ['prior_auth_required', 'auth_required', 'pre_auth_required'], category: 'Authorization' },
    { name: 'prior auth number', aliases: ['prior_auth_number', 'auth_number', 'authorization_number'], category: 'Authorization' },
    { name: 'prior auth approved flag', aliases: ['prior_auth_approved', 'auth_approved', 'authorization_approved'], category: 'Authorization' },
    { name: 'prior_auth_approval date', aliases: ['prior_auth_approval_date', 'auth_approval_date', 'authorization_date'], category: 'Authorization' },
    { name: 'referral required_flag', aliases: ['referral_required', 'referral_flag', 'ref_required'], category: 'Authorization' },
    { name: 'referral provider id', aliases: ['referral_provider_id', 'referring_provider', 'ref_provider'], category: 'Authorization' },
    { name: 'referral submission date', aliases: ['referral_submission_date', 'referral_date', 'ref_date'], category: 'Authorization' },
    
    // Denial Information
    { name: 'denial code', aliases: ['denial_code', 'deny_code', 'rejection_code'], category: 'Claim Status' },
    { name: 'denial reason', aliases: ['denial_reason', 'deny_reason', 'rejection_reason'], category: 'Claim Status' },
    
    // Policy Information
    { name: 'Payee type', aliases: ['payee_type', 'payee', 'payer_type'], category: 'Policy Information' },
    { name: 'Policy_Start_&_End Dates', aliases: ['policy_dates', 'policy_period', 'coverage_period'], category: 'Policy Information' },
    { name: 'policy_code', aliases: ['policy_code', 'policy_id', 'plan_code'], category: 'Policy Information' },
    { name: 'policy_name', aliases: ['policy_name', 'plan_name', 'policy_title'], category: 'Policy Information' },
    { name: 'policy_type', aliases: ['policy_type', 'plan_type', 'coverage_plan'], category: 'Policy Information' },
    { name: 'Policy max coverage', aliases: ['policy_max_coverage', 'max_coverage', 'coverage_limit'], category: 'Policy Information' },
    { name: 'policy_min_coverage', aliases: ['policy_min_coverage', 'min_coverage', 'minimum_coverage'], category: 'Policy Information' },
    { name: 'Deductible Amount', aliases: ['deductible_amount', 'deductible', 'annual_deductible'], category: 'Policy Information' },
    { name: 'Out of Pocket Max', aliases: ['out_of_pocket_max', 'oop_max', 'maximum_oop'], category: 'Policy Information' },
    { name: 'CoPay Amount', aliases: ['copay_amount', 'copay', 'co_pay_amount'], category: 'Policy Information' },
    { name: 'Coinsurance Percentage', aliases: ['coinsurance_percentage', 'coinsurance_pct', 'coins_pct'], category: 'Policy Information' },
    { name: 'Policy Start Date', aliases: ['policy_start_date', 'coverage_start', 'plan_start'], category: 'Policy Information' },
    { name: 'Policy End Date or Policy Expiry Date', aliases: ['policy_end_date', 'policy_expiry', 'coverage_end'], category: 'Policy Information' },
    { name: 'Enrollment Date', aliases: ['enrollment_date', 'enroll_date', 'effective_date'], category: 'Policy Information' },
    { name: 'Renewal Date', aliases: ['renewal_date', 'renew_date', 'policy_renewal'], category: 'Policy Information' },
    { name: 'Premium Amount_or Monthly Premium', aliases: ['premium_amount', 'monthly_premium', 'premium'], category: 'Policy Information' },
    { name: 'Premium Frequency (e.g. monthly, quarterly)', aliases: ['premium_frequency', 'payment_frequency', 'billing_frequency'], category: 'Policy Information' },
    { name: 'Employer Contribution', aliases: ['employer_contribution', 'employer_share', 'company_contribution'], category: 'Policy Information' },
    { name: 'Customer Contribution', aliases: ['customer_contribution', 'employee_contribution', 'member_contribution'], category: 'Policy Information' },
    { name: 'Network Type (In-Network, Out-of-Network)', aliases: ['network_type', 'provider_network', 'network'], category: 'Policy Information' },
    { name: 'Coverage Area or Service Area', aliases: ['coverage_area', 'service_area', 'geographic_area'], category: 'Policy Information' },
    { name: 'Prescription Coverage (Yes/No or details)', aliases: ['prescription_coverage', 'drug_coverage', 'pharmacy_coverage'], category: 'Policy Information' },
    { name: 'Preventive Services Covered', aliases: ['preventive_services', 'wellness_coverage', 'preventive_care'], category: 'Policy Information' },
    { name: 'Policy Status (Active, Inactive, Cancelled)', aliases: ['policy_status', 'coverage_status', 'plan_status'], category: 'Policy Information' },
    { name: 'Is Default Policy (Boolean)', aliases: ['is_default_policy', 'default_policy', 'primary_policy'], category: 'Policy Information' },
    { name: 'Renewed_Flag', aliases: ['renewed_flag', 'renewal_flag', 'auto_renewed'], category: 'Policy Information' },
    
    // Additional Information
    { name: 'Previous_Fraud_Flags', aliases: ['previous_fraud_flags', 'fraud_history', 'prior_fraud'], category: 'Risk Information' },
    { name: 'Location/Zip Code member and provider', aliases: ['location', 'zip_code', 'postal_code', 'address'], category: 'Location Information' },
    { name: 'Claim_hash_total', aliases: ['claim_hash_total', 'hash_total', 'claim_hash'], category: 'Technical Information' },
    { name: 'Diagnostic_name', aliases: ['diagnostic_name', 'diagnosis_name', 'condition_name'], category: 'Medical Information' },
    { name: 'Payee_rule_code', aliases: ['payee_rule_code', 'payment_rule', 'payout_rule'], category: 'Technical Information' },
    { name: 'Benefit_head_code', aliases: ['benefit_head_code', 'benefit_code', 'coverage_code'], category: 'Technical Information' },
    { name: 'Benefit_head_descr', aliases: ['benefit_head_descr', 'benefit_description', 'coverage_description'], category: 'Technical Information' },
    { name: 'Country_code(Treatment Country)', aliases: ['treatment_country_code', 'treatment_country', 'service_country'], category: 'Location Information' }
  ];

  // Persistent mapping storage helpers
  const STORAGE_KEY = 'fwa_csv_field_mapping_v1';

  const buildApprovedMappingDict = (mappingArr: any[]): Record<string, string> => {
    return mappingArr.reduce((acc: Record<string, string>, item: any) => {
      if (item && item.found && item.match) {
        acc[item.required] = item.match;
      }
      return acc;
    }, {});
  };

  const saveApprovedMapping = (headers: string[], mappingArr: any[]) => {
    try {
      const mappingDict = buildApprovedMappingDict(mappingArr);
      const payload = { headers, mapping: mappingDict, savedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setApprovedMapping(mappingDict);
    } catch (e) {
      // no-op if storage not available
    }
  };

  const loadApprovedMapping = (): { headers: string[]; mapping: Record<string, string> } | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.mapping) return parsed;
    } catch (e) {
      // ignore
    }
    return null;
  };

  const isHeaderSetCompatible = (savedHeaders: string[], currentHeaders: string[]) => {
    if (!Array.isArray(savedHeaders) || !Array.isArray(currentHeaders)) return false;
    // consider compatible if all saved headers exist in current headers (subset)
    const currentSet = new Set(currentHeaders.map(h => (h || '').toString().trim().toLowerCase()));
    return savedHeaders.every(h => currentSet.has((h || '').toString().trim().toLowerCase()));
  };

  // Function to find best match for a field
  const findBestMatch = (fieldName: string, availableHeaders: string[]) => {
    const normalizedField = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // First, check exact matches in aliases
    for (const required of requiredFields) {
      if (required.aliases.some(alias => alias.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedField)) {
        return { required: required.name, match: fieldName, confidence: 'exact' };
      }
    }

    // Then check partial matches
    let bestMatch = null;
    let bestScore = 0;
    let bestRequired = '';

    for (const required of requiredFields) {
      for (const alias of required.aliases) {
        const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        const score = calculateSimilarity(normalizedField, normalizedAlias);
        if (score > bestScore && score > 0.6) {
          bestScore = score;
          bestMatch = fieldName;
          bestRequired = required.name;
        }
      }
    }

    if (bestMatch) {
      return { required: bestRequired, match: bestMatch, confidence: bestScore > 0.8 ? 'high' : 'medium' };
    }

    return null;
  };

  // Simple string similarity function
  const calculateSimilarity = (str1: string, str2: string) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const getEditDistance = (str1: string, str2: string) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // Function to analyze CSV headers and create field mapping
  const analyzeCSVFields = useCallback((headers: string[]) => {
    const mapping = requiredFields.map(required => {
      const matches = headers.map(header => findBestMatch(header, headers))
        .filter(match => match && match.required === required.name);
      
      const bestMatch = matches.length > 0 ? matches[0] : null;
      
      return {
        required: required.name,
        found: !!bestMatch,
        match: bestMatch?.match || null,
        confidence: bestMatch?.confidence || 'none',
        status: bestMatch ? 'found' : 'missing'
      };
    });

    setFieldMapping(mapping);
  }, []);

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
    setErrorMessage('');

    // Parse CSV to get headers
    Papa.parse(file, {
      header: true,
      preview: 1,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields);
          analyzeCSVFields(results.meta.fields);
          // Try to load a previously approved mapping for these headers
          const saved = loadApprovedMapping();
          if (saved && isHeaderSetCompatible(saved.headers || [], results.meta.fields || [])) {
            setApprovedMapping(saved.mapping || null);
          } else {
            setApprovedMapping(null);
          }
          setUploadStatus('field-review');
        } else {
          setUploadStatus('file-selected');
        }
      },
      error: (error) => {
        console.error('Error reading CSV headers:', error);
        setUploadStatus('file-selected');
      }
    });
  }, [analyzeCSVFields]);

  const proceedWithValidation = () => {
    // Treat proceeding as approval of the current mapping; persist it
    let mappingDict: Record<string, string> = {};
    
    // We allow proceeding with missing fields as per the UI message
    // Just log a warning to the console
    const missingRequiredFields = fieldMapping.filter(mapping => !mapping.found);
    if (missingRequiredFields.length > 0) {
      console.warn(`Missing ${missingRequiredFields.length} required fields. Analysis may be limited.`);
    }
    
    if (csvHeaders.length && fieldMapping.length) {
      saveApprovedMapping(csvHeaders, fieldMapping);
      
      // Create field_mapping dictionary from the approved mapping
      // For multiple mappings, we'll create a more complex structure
      mappingDict = {};
      const multiMappings: Record<string, string[]> = {};
      
      // First pass: identify columns mapped to multiple fields
      fieldMapping.forEach(mapping => {
        if (mapping.found && mapping.match && mapping.required) {
          if (!multiMappings[mapping.match]) {
            multiMappings[mapping.match] = [];
          }
          multiMappings[mapping.match].push(mapping.required);
        }
      });
      
      // Second pass: create the mapping dictionary
      Object.entries(multiMappings).forEach(([csvColumn, requiredFields]) => {
        if (requiredFields.length === 1) {
          // Simple 1:1 mapping
          mappingDict[csvColumn] = requiredFields[0];
        } else {
          // For columns mapped to multiple fields, we'll use the first one as primary
          // and create duplicate columns for the others
          mappingDict[csvColumn] = requiredFields[0];
          
          // Log the multiple mappings for debugging
          console.log(`Column "${csvColumn}" is mapped to multiple fields: ${requiredFields.join(', ')}`);
        }
      });
      
      // Store the field mapping for later use
      setApprovedMapping(mappingDict);
      
      // Also store the multi-mapping information for later use
      setMultiMappings(multiMappings);
    }
    
    // Load the full CSV data for descriptive analysis
    if (selectedFile) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Store the original data
          const originalData = results.data;
          
          // Rename DataFrame columns using the field mapping
          if (Object.keys(mappingDict).length > 0) {
            // Apply column renaming to the data
            const renamedData = originalData.map((row: any) => {
              const newRow: any = {};
              
              // Process each key in the original row
              Object.keys(row).forEach(key => {
                // Get the primary mapping for this column
                const newKey = mappingDict[key] || key;
                newRow[newKey] = row[key];
                
                // If this column is mapped to multiple fields, create duplicate entries
                if (multiMappings[key] && multiMappings[key].length > 1) {
                  // Skip the first one as it's already handled above
                  multiMappings[key].slice(1).forEach(additionalField => {
                    newRow[additionalField] = row[key];
                  });
                }
              });
              
              return newRow;
            });
            setRawCsvData(renamedData);
          } else {
            setRawCsvData(originalData);
          }
          
          setUploadStatus('descriptive-analysis');
        },
        error: (error) => {
          console.error('Error parsing full CSV:', error);
          setUploadStatus('file-selected');
        }
      });
    }
  };

  // Generate descriptive analysis data
  const generateAnalysisData = useCallback(() => {
    if (!rawCsvData.length) return {};

    // Helper function to safely parse numbers
    const parseAmount = (value: any) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Helper to get a value directly by required field name (since columns are already renamed)
    const getByRequired = (row: any, requiredName: string) => {
      // First try direct access with the required field name
      if (row.hasOwnProperty(requiredName)) return row[requiredName];
      
      // Fallback to the old mapping method if needed
      const header = approvedMapping?.[requiredName];
      if (header && row.hasOwnProperty(header)) return row[header];
      
      return undefined;
    };

    // Helper function to get date field value, using renamed columns
    const getDateField = (row: any) => {
      // Try direct access first since columns should be renamed
      if (row['Claim_invoice_date']) return row['Claim_invoice_date'];
      if (row['Treatment from date']) return row['Treatment from date'];
      if (row['Treatment to date']) return row['Treatment to date'];
      if (row['Admission date']) return row['Admission date'];
      
      // Fallback to the old mapping method
      const viaRequired = (
        getByRequired(row, 'Claim_invoice_date') ||
        getByRequired(row, 'Treatment from date') ||
        getByRequired(row, 'Treatment to date') ||
        getByRequired(row, 'Admission date') ||
        getByRequired(row, 'Discharge date')
      );
      return viaRequired || row.service_date || row.ServiceDate || row.claim_date || row.ClaimDate || 
             row.claim_invoice_date || row.ClaimInvoiceDate || row.date || row.Date || null;
    };

    // Helper function to get amount field value - prioritize mapped fields
    const getAmountField = (row: any) => {
      // Try direct access with standard field names first
      if (row['billed_amount'] !== undefined) return parseAmount(row['billed_amount']);
      if (row['Paid amount'] !== undefined) return parseAmount(row['Paid amount']);
      if (row['allowed_amount'] !== undefined) return parseAmount(row['allowed_amount']);
      
      // Then try via required mapping
      const viaRequired = getByRequired(row, 'billed_amount') || 
                          getByRequired(row, 'Paid amount') || 
                          getByRequired(row, 'allowed_amount');
      
      // Fallback to original fields
      return parseAmount(viaRequired ?? row.billed_amount ?? row.BilledAmount ?? row.amount ?? row.Amount ?? 0);
    };

    // Helper function to get provider field value - prioritize mapped fields
    const getProviderField = (row: any) => {
      // Try direct access with standard field names first
      if (row['Provider ID'] !== undefined) return row['Provider ID'];
      if (row['Provider Name'] !== undefined) return row['Provider Name'];
      
      // Then try via required mapping
      const viaRequired = getByRequired(row, 'Provider ID') || getByRequired(row, 'Provider Name');
      
      // Fallback to original fields
      return viaRequired || row.provider_id || row.ProviderID || row.provider || row.Provider || 'Unknown';
    };

    // Helper function to get service type field value - prioritize mapped fields
    const getServiceTypeField = (row: any) => {
      // Try direct access with standard field names first
      if (row['Coverage type (Inpatient, Outpatient, Pharmacy, etc.)'] !== undefined) 
        return row['Coverage type (Inpatient, Outpatient, Pharmacy, etc.)'];
      if (row['Facility_type (Clinic, Hospital, Lab)'] !== undefined) 
        return row['Facility_type (Clinic, Hospital, Lab)'];
      
      // Then try via required mapping
      const viaRequired = getByRequired(row, 'Coverage type (Inpatient, Outpatient, Pharmacy, etc.)') || 
                          getByRequired(row, 'Facility_type (Clinic, Hospital, Lab)');
      
      // Fallback to original fields
      return viaRequired || row.service_type || row.ServiceType || row.coverage_type || row.CoverageType || 
             row.care_type || row.CareType || 'General';
    };

    // 1. Claims Volume Over Time
    const claimsOverTime = rawCsvData.reduce((acc: any, row: any) => {
      const dateValue = getDateField(row);
      if (dateValue) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const monthYear = date.toISOString().slice(0, 7); // YYYY-MM
          acc[monthYear] = (acc[monthYear] || 0) + 1;
        }
      }
      return acc;
    }, {});

    const timeSeriesData = Object.entries(claimsOverTime)
      .sort()
      .slice(-12) // Last 12 months
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        claims: count
      }));

    // 2. Amount Distribution Over Time
    const amountOverTime = rawCsvData.reduce((acc: any, row: any) => {
      const dateValue = getDateField(row);
      const amount = getAmountField(row);
      if (dateValue && amount > 0) {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const monthYear = date.toISOString().slice(0, 7);
          if (!acc[monthYear]) acc[monthYear] = { total: 0, count: 0 };
          acc[monthYear].total += amount;
          acc[monthYear].count += 1;
        }
      }
      return acc;
    }, {});

    const amountTimeSeriesData = Object.entries(amountOverTime)
      .sort()
      .slice(-12)
      .map(([month, data]: [string, any]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        totalAmount: Math.round(data.total),
        avgAmount: Math.round(data.total / data.count)
      }));

    // 3. Top Providers by Claims Volume
    const providerStats = rawCsvData.reduce((acc: any, row: any) => {
      const provider = getProviderField(row);
      const amount = getAmountField(row);
      if (!acc[provider]) acc[provider] = { claims: 0, totalAmount: 0 };
      acc[provider].claims += 1;
      acc[provider].totalAmount += amount;
      return acc;
    }, {});

    const topProviders = Object.entries(providerStats)
      .sort((a: any, b: any) => b[1].claims - a[1].claims)
      .slice(0, 10)
      .map(([provider, stats]: [string, any]) => ({
        provider: provider.length > 15 ? `${provider.substring(0, 15)}...` : provider,
        claims: stats.claims,
        totalAmount: Math.round(stats.totalAmount)
      }));

    // 4. Service Type Distribution
    const serviceTypeStats = rawCsvData.reduce((acc: any, row: any) => {
      const serviceType = getServiceTypeField(row);
      acc[serviceType] = (acc[serviceType] || 0) + 1;
      return acc;
    }, {});

    const serviceTypeData = Object.entries(serviceTypeStats)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 8)
      .map(([type, count]: [string, any]) => ({
        name: type,
        value: count,
        percentage: Math.round((count / rawCsvData.length) * 100)
      }));

    // 5. Amount Distribution (Histogram-like)
    const amounts = rawCsvData.map(row => getAmountField(row)).filter(amount => amount > 0);
    amounts.sort((a, b) => a - b);
    
    const ranges = [
      { range: '$0-1K', min: 0, max: 1000 },
      { range: '$1K-5K', min: 1000, max: 5000 },
      { range: '$5K-10K', min: 5000, max: 10000 },
      { range: '$10K-25K', min: 10000, max: 25000 },
      { range: '$25K-50K', min: 25000, max: 50000 },
      { range: '$50K+', min: 50000, max: Infinity }
    ];

    const distributionData = ranges.map(({ range, min, max }) => ({
      range,
      count: amounts.filter(amount => amount >= min && amount < max).length
    }));

    // 6. Basic Statistics
    const totalClaims = rawCsvData.length;
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    const avgAmount = amounts.length > 0 ? totalAmount / amounts.length : 0;
    const uniqueProviders = new Set(rawCsvData.map(row => getProviderField(row))).size;
    const dateRange = (() => {
      const dates = rawCsvData.map(row => getDateField(row)).filter(Boolean);
      if (dates.length === 0) return 'N/A';
      const validDates = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
      if (validDates.length === 0) return 'N/A';
      validDates.sort((a, b) => a.getTime() - b.getTime());
      const start = validDates[0].toLocaleDateString();
      const end = validDates[validDates.length - 1].toLocaleDateString();
      return `${start} - ${end}`;
    })();

    return {
      timeSeriesData,
      amountTimeSeriesData,
      topProviders,
      serviceTypeData,
      distributionData,
      summary: {
        totalClaims,
        totalAmount,
        avgAmount,
        uniqueProviders,
        dateRange
      }
    };
  }, [rawCsvData]);

  const proceedToValidation = () => {
    setUploadStatus('file-selected');
  };

  const handleValidationMethodChange = (method: keyof ValidationMethods, checked: boolean) => {
    setValidationMethods(prev => ({
      ...prev,
      [method]: checked
    }));
  };

  // ML-based anomaly detection (simplified for compact view)
  const detectMLAnomalies = useCallback((data: ClaimsData[]) => {
    const anomalies: any[] = [];
    
    const amounts = data.map(d => d.billed_amount).filter(a => a > 0);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    
    const providerMetrics = data.reduce((acc, claim) => {
      if (!acc[claim.provider_id]) {
        acc[claim.provider_id] = { total_billed: 0, claim_count: 0, weekend_claims: 0 };
      }
      
      const provider = acc[claim.provider_id];
      provider.total_billed += claim.billed_amount;
      provider.claim_count += 1;
      
      const serviceDate = new Date(claim.service_date);
      if (serviceDate.getDay() === 0 || serviceDate.getDay() === 6) {
        provider.weekend_claims += 1;
      }
      
      return acc;
    }, {} as Record<string, any>);

    data.forEach((claim, index) => {
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

      const provider = providerMetrics[claim.provider_id];
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
    });

    return anomalies;
  }, []);

  // Python Rules-based anomaly detection (simplified)
  const detectPythonRulesAnomalies = useCallback((data: ClaimsData[]) => {
    const anomalies: any[] = [];
    
    const HIGH_AMOUNT_THRESHOLD = 50000;
    const MEDIUM_AMOUNT_THRESHOLD = 10000;
    const SUSPICIOUS_PAYMENT_RATIO = 0.7;
    
    const providerCounts = data.reduce((acc, claim) => {
      acc[claim.provider_id] = (acc[claim.provider_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    data.forEach((claim, index) => {
      if (claim.billed_amount > HIGH_AMOUNT_THRESHOLD) {
        anomalies.push({
          id: `rule_high_amount_${index}`,
          type: 'Rule: Excessive Billing Amount',
          method: 'Python Rules',
          severity: 'High',
          claim_id: claim.claim_id,
          provider_id: claim.provider_id,
          provider_name: claim.provider_name,
          description: `Business rule violation: Billing amount $${claim.billed_amount.toLocaleString()} exceeds threshold`,
          risk_score: Math.min(100, (claim.billed_amount / HIGH_AMOUNT_THRESHOLD) * 80),
          service_date: claim.service_date,
          billed_amount: claim.billed_amount
        });
      }

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
          description: `Business rule alert: Payment ratio ${(paymentRatio * 100).toFixed(1)}% is unusually high`,
          risk_score: paymentRatio * 90,
          service_date: claim.service_date,
          billed_amount: claim.billed_amount
        });
      }
    });

    return anomalies;
  }, []);

  // Function to detect anomalies based on selected validation methods
  const detectAnomalies = useCallback((data: ClaimsData[], methods: ValidationMethods) => {
    const anomalies: any[] = [];
    
    if (methods.ml) {
      anomalies.push(...detectMLAnomalies(data));
    }
    
    if (methods.pythonRules) {
      anomalies.push(...detectPythonRulesAnomalies(data));
    }

    return anomalies;
  }, [detectMLAnomalies, detectPythonRulesAnomalies]);

  const API_BASE_URL = API_CONFIG.BASE_URL;

  const processFile = useCallback(() => {
    if (!selectedFile) return;

    if (!validationMethods.ml && !validationMethods.pythonRules) {
      setErrorMessage('Please select at least one validation method.');
      return;
    }

    setUploadStatus('uploading');
    setProgress(10);
    setErrorMessage('');

    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Add validation methods to the request
    formData.append('use_ml', validationMethods.ml.toString());
    formData.append('use_python_rules', validationMethods.pythonRules.toString());

    // Upload the file to the API
    fetch(`${API_BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD}`, {
      method: 'POST',
      body: formData,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        setProgress(50);
        return response.json();
      })
      .then(data => {
        setUploadStatus('processing');
        
        // Get the uploaded file path from the response
        const filePath = data.file_path;
        
        // Now analyze the uploaded file with selected scenarios
        const scenarios = [];
        if (validationMethods.pythonRules) {
          scenarios.push(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22); // Run all scenarios when Python rules is selected
        }
        
        // Show analyzing state immediately before API call
        setUploadStatus('analyzing');
        setProgress(60);
        
        return fetch(`${API_BASE_URL}${API_CONFIG.ENDPOINTS.ANALYZE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_path: filePath,
            scenarios: scenarios
          }),
        });
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        setProgress(75);
        return response.json();
      })
      .then(data => {
        console.log('Analysis results received:', data);
        
        // Use the original CSV data returned from the backend (preserve all original columns)
        const transformedData: ClaimsData[] = data.claimsData?.map((row: any, index: number) => {
          // Keep all original CSV columns and add standardized fields for compatibility
          return {
            ...row, // Preserve all original CSV columns
            // Add standardized fields for backward compatibility
            claim_id: row['Claim_ID'] || row.claim_id || `CLAIM_${index + 1}`,
            provider_id: row['Provider_ID'] || row.provider_id || `PROV_${index + 1}`,
            provider_name: row['Provider__descr'] || row.provider_name || `Provider ${index + 1}`,
            patient_id: row['Member_ID'] || row.patient_id || `PAT_${index + 1}`,
            service_date: row['Treatment from date'] || row.service_date || new Date().toISOString().split('T')[0],
            procedure_code: row['Procedure_code'] || row.procedure_code || 'UNKNOWN',
            diagnosis_code: row['diagnosis_code'] || row.diagnosis_code || 'UNKNOWN',
            billed_amount: parseFloat(row['Claim_invoice_gross_total_amount'] || row.billed_amount || 0),
            allowed_amount: parseFloat(row.allowed_amount || 0),
            paid_amount: parseFloat(row['Paid_amount'] || row.paid_amount || 0),
            service_type: row['Benefit_head_descr'] || row.service_type || 'General',
            specialty: row['Provider type'] || row.specialty || 'General Practice'
          };
        }) || [];

        // Use anomalies directly from backend
        const anomalies = data.anomaliesData || [];
        
        // If ML validation is enabled, add mock ML anomalies for now
        let allAnomalies = [...anomalies];
        if (validationMethods.ml) {
          const mlAnomalies = detectMLAnomalies(transformedData);
          allAnomalies = [...allAnomalies, ...mlAnomalies];
        }
        
        setProgress(100);
        setUploadedData(transformedData);
        setDetectedAnomalies(allAnomalies);
        setUploadStatus('complete');

        // Navigate to the dashboard with the data
        setTimeout(() => {
          onDataUploaded(transformedData, allAnomalies, data.results, data.summary);
        }, 500);

      })
      .catch(error => {
        console.error('API error:', error);
        setErrorMessage(`API Error: ${error.message}`);
        setUploadStatus('error');
      });
  }, [selectedFile, validationMethods, detectMLAnomalies, onDataUploaded]);

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

  // Show loading page during analysis
  if (uploadStatus === 'analyzing') {
    return <AnalysisLoadingPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Claims Data</h1>
            <p className="text-gray-600">Upload and analyze your healthcare claims for fraud detection</p>
          </div>
        </div>

        <Card>
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
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <div className="space-y-2">
                    <p>Choose a CSV file to upload</p>
                    <p className="text-sm text-gray-500">
                      File should contain columns: claim_id, provider_id, provider_name, billed_amount, paid_amount, service_date
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="mt-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>
            )}

            {uploadStatus === 'file-selected' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-gray-500 ml-auto">Ready for processing</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <h3 className="font-medium">Select Validation Methods</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border rounded-lg p-3 space-y-2">
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
                      <p className="text-xs text-gray-600 ml-6">
                        Advanced statistical analysis and pattern recognition using ML algorithms.
                      </p>
                    </div>

                    <div className="border rounded-lg p-3 space-y-2">
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
                      <p className="text-xs text-gray-600 ml-6">
                        Business rule-based validation using predefined thresholds.
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

            {uploadStatus === 'field-review' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-gray-500 ml-auto">Field mapping review</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-gray-600" />
                    <h3 className="font-medium">Field Mapping Review</h3>
                    <span className="text-sm text-gray-500">
                      ({fieldMapping.filter(m => m.found).length} of {fieldMapping.length} required fields found)
                    </span>
                  </div>

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <div className="font-bold text-green-900">{fieldMapping.filter(m => m.found).length}</div>
                      <div className="text-xs text-green-600">Fields Found</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg text-center">
                      <div className="font-bold text-orange-900">{fieldMapping.filter(m => !m.found).length}</div>
                      <div className="text-xs text-orange-600">Missing Fields</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="font-bold text-blue-900">{csvHeaders.length}</div>
                      <div className="text-xs text-blue-600">CSV Headers</div>
                    </div>
                  </div>
                  
                  {/* Grouped Field Mapping */}
                  <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium mb-3">Field Mapping by Category</h4>
                    {Object.entries(
                      fieldMapping.reduce((groups, mapping) => {
                        const category = requiredFields.find(rf => rf.name === mapping.required)?.category || 'Other';
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(mapping);
                        return groups;
                      }, {} as Record<string, any[]>)
                    ).map(([category, mappings]) => (
                      <div key={category} className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="text-sm font-medium text-gray-800">{category}</h5>
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                            {mappings.filter((m: any) => m.found).length}/{mappings.length} found
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {mappings.map((mapping: any, index: number) => (
                            <div key={`${category}-${index}`} className="flex items-center justify-between p-2 bg-white rounded border text-xs">
                              <div className="flex items-center gap-2">
                                {mapping.found ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <X className="h-3 w-3 text-red-600" />
                                )}
                                <span className="font-medium truncate" title={mapping.required}>
                                  {mapping.required.length > 20 ? `${mapping.required.substring(0, 20)}...` : mapping.required}
                                </span>
                              </div>
                              <div className="text-right ml-2 flex-shrink-0">
                                <select 
                                  className="text-xs border rounded p-1 bg-white"
                                  value={mapping.match || ""}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    const updatedMapping = [...fieldMapping];
                                    const mappingIndex = updatedMapping.findIndex(m => m.required === mapping.required);
                                    
                                    if (mappingIndex !== -1) {
                                      updatedMapping[mappingIndex] = {
                                        ...updatedMapping[mappingIndex],
                                        match: newValue,
                                        found: newValue !== "",
                                        status: newValue !== "" ? 'found' : 'missing',
                                        confidence: 'user-selected'
                                      };
                                      setFieldMapping(updatedMapping);
                                    }
                                  }}
                                >
                                  <option value="">-- Select Field --</option>
                                  {csvHeaders.map((header, i) => (
                                    <option key={i} value={header}>
                                      {header.length > 25 ? `${header.substring(0, 25)}...` : header}
                                    </option>
                                  ))}
                                </select>
                                {/* Show if this column is mapped to other fields */}
                                {mapping.match && fieldMapping.filter(m => 
                                  m.match === mapping.match && 
                                  m.required !== mapping.required && 
                                  m.found
                                ).length > 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Also mapped to: {fieldMapping
                                      .filter(m => m.match === mapping.match && m.required !== mapping.required && m.found)
                                      .map(m => m.required.length > 10 ? `${m.required.substring(0, 10)}...` : m.required)
                                      .join(', ')}
                                  </div>
                                )}
                                {mapping.found && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {mapping.confidence === 'exact' && '✓ Exact match'}
                                    {mapping.confidence === 'high' && '⚠ High confidence'}
                                    {mapping.confidence === 'medium' && '⚠ Medium confidence'}
                                    {mapping.confidence === 'user-selected' && '👤 User selected'}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Available CSV Headers ({csvHeaders.length}):</h4>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {csvHeaders.map((header, index) => (
                        <span 
                          key={index} 
                          className="text-xs bg-white px-2 py-1 rounded border text-gray-700"
                          title={header}
                        >
                          {header.length > 15 ? `${header.substring(0, 15)}...` : header}
                        </span>
                      ))}
                    </div>
                  </div>

                  {fieldMapping.some(mapping => !mapping.found) && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {fieldMapping.filter(m => !m.found).length} required fields are missing. You can still proceed, but the analysis may be limited. 
                        Consider renaming your CSV columns to match the expected field names for better results.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={proceedWithValidation} 
                    className="flex-1"
                  >
                    {fieldMapping.some(mapping => !mapping.found) 
                      ? `Proceed with ${fieldMapping.filter(m => m.found).length} Fields` 
                      : 'Continue with Validation'}
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    Choose Different File
                  </Button>
                </div>
              </div>
            )}

            {uploadStatus === 'descriptive-analysis' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-gray-500 ml-auto">Descriptive Analysis</span>
                </div>

                {/* Generate analysis data */}
                {(() => {
                  const analysisData = generateAnalysisData();
                  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
                  
                  return (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-gray-600" />
                        <h3 className="font-medium">Data Overview & Insights</h3>
                      </div>

                      {/* Summary Statistics */}
                      {analysisData.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                          <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <FileText className="h-3 w-3 text-blue-600" />
                            </div>
                            <div className="font-bold text-blue-900">{analysisData.summary.totalClaims.toLocaleString()}</div>
                            <div className="text-xs text-blue-600">Total Claims</div>
                          </div>
                          
                          <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                            </div>
                            <div className="font-bold text-green-900">${Math.round(analysisData.summary.totalAmount).toLocaleString()}</div>
                            <div className="text-xs text-green-600">Total Amount</div>
                          </div>

                          <div className="bg-purple-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <BarChart3 className="h-3 w-3 text-purple-600" />
                            </div>
                            <div className="font-bold text-purple-900">${Math.round(analysisData.summary.avgAmount).toLocaleString()}</div>
                            <div className="text-xs text-purple-600">Avg Amount</div>
                          </div>

                          <div className="bg-orange-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Users className="h-3 w-3 text-orange-600" />
                            </div>
                            <div className="font-bold text-orange-900">{analysisData.summary.uniqueProviders}</div>
                            <div className="text-xs text-orange-600">Providers</div>
                          </div>

                          <div className="bg-gray-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Calendar className="h-3 w-3 text-gray-600" />
                            </div>
                            <div className="font-bold text-gray-900 text-xs">{analysisData.summary.dateRange}</div>
                            <div className="text-xs text-gray-600">Date Range</div>
                          </div>
                        </div>
                      )}

                      {/* Charts Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        
                        {/* Claims Volume Over Time */}
                        {analysisData.timeSeriesData && analysisData.timeSeriesData.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Claims Volume Trend</CardTitle>
                              <CardDescription className="text-xs">Monthly claims volume over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={analysisData.timeSeriesData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="claims" stroke="#3B82F6" strokeWidth={2} />
                                </LineChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* Amount Trends */}
                        {analysisData.amountTimeSeriesData && analysisData.amountTimeSeriesData.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Amount Trends</CardTitle>
                              <CardDescription className="text-xs">Total and average amounts over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={analysisData.amountTimeSeriesData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                                  <Area type="monotone" dataKey="totalAmount" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                                  <Area type="monotone" dataKey="avgAmount" stackId="2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}



                        {/* Service Type Distribution */}
                        {analysisData.serviceTypeData && analysisData.serviceTypeData.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Service Type Distribution</CardTitle>
                              <CardDescription className="text-xs">Claims by service category</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                  <Pie
                                    data={analysisData.serviceTypeData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={60}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percentage }) => `${name} ${percentage}%`}
                                    labelLine={false}
                                    fontSize={9}
                                  >
                                    {analysisData.serviceTypeData.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* Amount Distribution */}
                        {analysisData.distributionData && analysisData.distributionData.length > 0 && (
                          <Card className="lg:col-span-2">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Amount Distribution</CardTitle>
                              <CardDescription className="text-xs">Claims count by amount ranges</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={analysisData.distributionData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip />
                                  <Bar dataKey="count" fill="#8B5CF6" />
                                </BarChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Key Insights */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium mb-2 text-blue-900">Key Insights</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-800">
                          <div>• Average claim amount: ${Math.round(analysisData.summary?.avgAmount || 0).toLocaleString()}</div>
                          <div>• Data spans: {analysisData.summary?.dateRange || 'N/A'}</div>
                          <div>• Top provider has {analysisData.topProviders?.[0]?.claims || 0} claims</div>
                          <div>• Most common service: {analysisData.serviceTypeData?.[0]?.name || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Validation Method Selection */}
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Settings className="h-4 w-4 text-gray-600" />
                          <h3 className="font-medium">Select Validation Methods</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="ml-validation-analysis" 
                                checked={validationMethods.ml}
                                onCheckedChange={(checked) => handleValidationMethodChange('ml', checked as boolean)}
                              />
                              <Label htmlFor="ml-validation-analysis" className="flex items-center gap-2 cursor-pointer">
                                <Brain className="h-4 w-4 text-purple-600" />
                                Machine Learning Validation
                              </Label>
                            </div>
                            <p className="text-xs text-gray-600 ml-6">
                              Advanced statistical analysis and pattern recognition using ML algorithms.
                            </p>
                          </div>

                          <div className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="rules-validation-analysis" 
                                checked={validationMethods.pythonRules}
                                onCheckedChange={(checked) => handleValidationMethodChange('pythonRules', checked as boolean)}
                              />
                              <Label htmlFor="rules-validation-analysis" className="flex items-center gap-2 cursor-pointer">
                                <Code className="h-4 w-4 text-green-600" />
                                Python Rules Validation
                              </Label>
                            </div>
                            <p className="text-xs text-gray-600 ml-6">
                              Business rule-based validation using predefined thresholds.
                            </p>
                          </div>
                        </div>

                        {(!validationMethods.ml && !validationMethods.pythonRules) && (
                          <Alert variant="destructive" className="mt-3">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Please select at least one validation method to proceed.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button 
                          onClick={processFile} 
                          className="flex-1"
                          disabled={!validationMethods.ml && !validationMethods.pythonRules}
                        >
                          Continue to Fraud Detection Analysis
                        </Button>
                        <Button variant="outline" onClick={() => setUploadStatus('field-review')}>
                          Back to Field Review
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompactCSVUpload;