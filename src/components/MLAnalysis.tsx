import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Rocket, PartyPopper, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import API_CONFIG from '../config/api';
import { useStore } from '../store/useStore';

// Define interfaces for the expected data structures
interface JobStatus {
  job_id: string;
  status: 'started' | 'completed' | 'error';
  current_step: number;
  total_steps: number;
  current_message: string;
  business_explanation: string;
  progress: number;
  results?: AnalysisResults;
  error?: string;
}

interface AnalysisResults {
  kpi: {
    total_records: number;
    total_anomalies: number;
    detection_rate: number;
    high_priority_cases: number;
  };
  top_risk_areas: RiskArea[];
  root_cause_analysis: string;
  flagged_records: FlaggedRecord[];
}

interface RiskArea {
  area: string;
  impact: 'High' | 'Medium' | 'Low';
  cases: number;
  avg_risk_score: number;
  businessImpact: string;
}

interface FlaggedRecord {
  Claim_ID: string;
  Provider_ID: string;
  Combined_Score: number;
  Anomaly_Type: 'Global' | 'Local' | 'Both';
  Global_Explanation: string;
  Local_Explanation: string;
}

const MLAnalysis = () => {
  const { mlAnalysisResults, setMlAnalysisResults } = useStore();
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(mlAnalysisResults);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setStatus(null);
    setJobId(null);
    setMlAnalysisResults(null); // Clear previous results
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/analyze/ml`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file_path: 'temp_upload.csv' }), // Assuming the file is already uploaded
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start analysis');
      }
      const data = await response.json();
      setJobId(data.job_id);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const pollStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/status/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      const data: JobStatus = await response.json();
      setStatus(data);

      if (data.status === 'completed') {
        setMlAnalysisResults(data);
        setIsLoading(false);
      } else if (data.status === 'error') {
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [jobId, setMlAnalysisResults]);

  useEffect(() => {
    if (isLoading && jobId) {
      const interval = setInterval(pollStatus, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [isLoading, jobId, pollStatus]);

  const cleanExplanation = (explanation: string) => {
    // Clean up the explanation by removing individual z-scores but keeping feature names
    // Input: "1.000 (diagnosis_code: 3.73, Diagnostic name: 3.63)"
    // Output: "1.000 (diagnosis_code, Diagnostic name)"

    return explanation.replace(/([a-zA-Z_\s]+):\s*[\d.-]+/g, '$1').trim();
  };

  const renderStructuredRecommendations = (rawText: string) => {
    // Parse the raw text into structured sections
    const parseRecommendations = (text: string) => {
      // Split by common patterns and clean up
      const sections = text.split(/(?:\d+\.|•|\n-|\n\*)/);
      const recommendations = sections
        .map(section => section.trim())
        .filter(section => section.length > 10) // Filter out very short sections
        .map(section => {
          // Clean up common prefixes and suffixes
          return section
            .replace(/^[:\-\s]+/, '') // Remove leading colons, dashes, spaces
            .replace(/\s+$/, '') // Remove trailing spaces
            .trim();
        });

      return recommendations;
    };

    // Categorize recommendations by keywords
    const categorizeRecommendation = (text: string) => {
      const lowerText = text.toLowerCase();

      if (lowerText.includes('immediate') || lowerText.includes('urgent') || lowerText.includes('critical') || lowerText.includes('suspend') || lowerText.includes('block')) {
        return { category: 'immediate', priority: 'High', color: 'red' };
      } else if (lowerText.includes('review') || lowerText.includes('investigate') || lowerText.includes('audit') || lowerText.includes('monitor')) {
        return { category: 'review', priority: 'Medium', color: 'orange' };
      } else if (lowerText.includes('implement') || lowerText.includes('establish') || lowerText.includes('create') || lowerText.includes('develop')) {
        return { category: 'implement', priority: 'Medium', color: 'blue' };
      } else if (lowerText.includes('prevent') || lowerText.includes('control') || lowerText.includes('policy') || lowerText.includes('training')) {
        return { category: 'preventive', priority: 'Low', color: 'green' };
      } else {
        return { category: 'general', priority: 'Medium', color: 'gray' };
      }
    };

    const recommendations = parseRecommendations(rawText);

    // Group recommendations by category
    const groupedRecommendations = recommendations.reduce((acc, rec) => {
      const { category, priority, color } = categorizeRecommendation(rec);
      if (!acc[category]) {
        acc[category] = { items: [], priority, color };
      }
      acc[category].items.push(rec);
      return acc;
    }, {} as Record<string, { items: string[], priority: string, color: string }>);

    const categoryTitles = {
      immediate: '🚨 Immediate Actions Required',
      review: '🔍 Review & Investigation',
      implement: '⚙️ Implementation & Controls',
      preventive: '🛡️ Preventive Measures',
      general: '📋 General Recommendations'
    };

    const categoryDescriptions = {
      immediate: 'Critical actions that require immediate attention',
      review: 'Areas requiring detailed review and investigation',
      implement: 'System improvements and control implementations',
      preventive: 'Long-term preventive measures and policies',
      general: 'Additional recommendations and insights'
    };

    return (
      <div className="space-y-6">
        {/* Executive Summary */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Executive Summary</AlertTitle>
          <AlertDescription className="text-blue-700">
            Based on the ML analysis, we've identified key areas requiring attention and have structured our recommendations by priority and action type.
          </AlertDescription>
        </Alert>

        {/* Structured Recommendations */}
        {Object.entries(groupedRecommendations).map(([category, data]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">
                {categoryTitles[category as keyof typeof categoryTitles]}
              </h4>
              <Badge
                variant="outline"
                className={`
                  ${data.color === 'red' ? 'border-red-300 text-red-700 bg-red-50' : ''}
                  ${data.color === 'orange' ? 'border-orange-300 text-orange-700 bg-orange-50' : ''}
                  ${data.color === 'blue' ? 'border-blue-300 text-blue-700 bg-blue-50' : ''}
                  ${data.color === 'green' ? 'border-green-300 text-green-700 bg-green-50' : ''}
                  ${data.color === 'gray' ? 'border-gray-300 text-gray-700 bg-gray-50' : ''}
                `}
              >
                {data.priority} Priority
              </Badge>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {categoryDescriptions[category as keyof typeof categoryDescriptions]}
            </p>

            <div className={`
              rounded-lg border-l-4 p-4 space-y-3
              ${data.color === 'red' ? 'border-l-red-400 bg-red-50' : ''}
              ${data.color === 'orange' ? 'border-l-orange-400 bg-orange-50' : ''}
              ${data.color === 'blue' ? 'border-l-blue-400 bg-blue-50' : ''}
              ${data.color === 'green' ? 'border-l-green-400 bg-green-50' : ''}
              ${data.color === 'gray' ? 'border-l-gray-400 bg-gray-50' : ''}
            `}>
              {data.items.map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`
                    w-2 h-2 rounded-full mt-2 flex-shrink-0
                    ${data.color === 'red' ? 'bg-red-400' : ''}
                    ${data.color === 'orange' ? 'bg-orange-400' : ''}
                    ${data.color === 'blue' ? 'bg-blue-400' : ''}
                    ${data.color === 'green' ? 'bg-green-400' : ''}
                    ${data.color === 'gray' ? 'bg-gray-400' : ''}
                  `}></div>
                  <p className="text-sm text-gray-800 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Fallback for cases where parsing doesn't work well */}
        {Object.keys(groupedRecommendations).length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Analysis Results</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">
              {rawText}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderResults = (results: AnalysisResults) => (
    <div className="space-y-6">
      <Alert className="bg-green-50 border-green-200">
        <PartyPopper className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Analysis Complete!</AlertTitle>
        <AlertDescription>
          The ML model has successfully analyzed your data. Here are the key findings.
        </AlertDescription>
      </Alert>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.kpi.total_records.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <span className="flex items-center gap-1">
                      Anomalies Found <Info className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The total number of claims identified as potential fraud, waste, or abuse by the ML model.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{results.kpi.total_anomalies.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <span className="flex items-center gap-1">
                      Detection Rate <Info className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The percentage of total claims that were flagged as anomalous. (Anomalies Found / Total Records)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.kpi.detection_rate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help">
                    <span className="flex items-center gap-1">
                      High Priority Cases <Info className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      The number of anomalies classified as 'Global' or 'Both', which are typically the highest risk and should be investigated first.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{results.kpi.high_priority_cases.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Risk Areas */}
        <Card>
          <CardHeader>
            <CardTitle>Top Risk Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={results.top_risk_areas} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="area" width={150} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cases" fill="#8884d8" name="Number of Cases" />
                <Bar dataKey="avg_risk_score" fill="#82ca9d" name="Avg. Risk Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Root Cause Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Root Cause Analysis & Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderStructuredRecommendations(results.root_cause_analysis)}
          </CardContent>
        </Card>
      </div>

      {/* Anomaly Detection Methodologies */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Detection Methodologies</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full space-y-4">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <AccordionItem value="item-1" className="border-0 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <span className="text-lg font-semibold text-purple-800">🌐 Global Anomaly Detection</span>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="space-y-6 pt-0 pb-4">
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                      <h4 className="font-semibold text-md text-purple-700 mb-2">Why This Matters:</h4>
                      <p className="text-purple-800">Uncovers systemic irregularities across all claims, enabling organizations to detect emerging fraud trends that rule-based systems may miss.</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                      <h4 className="font-semibold text-md text-purple-700 mb-2">How It Works:</h4>
                      <p className="text-purple-800">A Convolutional Autoencoder (CAE) learns normal claim patterns across the entire dataset by compressing and reconstructing each claim. Claims with significant reconstruction errors are flagged as global anomalies.</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
                      <h4 className="font-semibold text-md text-purple-700 mb-2">Real-World Example:</h4>
                      <p className="text-purple-800">A claim is submitted before the actual treatment date — a pattern that may indicate billing errors or potential fraud. The CAE flags this as a global anomaly, highlighting a systemic issue that spans multiple providers or regions.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </div>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <AccordionItem value="item-2" className="border-0 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100">
                <AccordionTrigger className="p-4 hover:no-underline">
                  <span className="text-lg font-semibold text-green-800">📍 Local Anomaly Detection</span>
                </AccordionTrigger>
                <AccordionContent className="px-4">
                  <div className="space-y-6 pt-0 pb-4">
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <h4 className="font-semibold text-md text-gray-900 mb-2">Why This Matters:</h4>
                      <p className="text-green-800">Identifies subtle, context-specific anomalies within clusters of claims, revealing micro-level irregularities that global models may overlook.</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <h4 className="font-semibold text-md text-gray-900 mb-2">How It Works:</h4>
                      <p className="text-green-800">Models such as HDBSCAN, LOF, One-Class SVM, and Isolation Forest compare claims to their closest peers, flagging claims that deviate from local norms.</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <h4 className="font-semibold text-md text-gray-900 mb-2">Real-World Example:</h4>
                      <p className="text-green-800">A male patient billed for a mammogram stands out within gender-specific procedure clusters. Local anomaly detection flags this behavior, helping identify potential procedural errors or inappropriate billing at the provider level.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </div>
          </Accordion>
        </CardContent>
      </Card>

      {/* Flagged Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>High-Risk Flagged Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Provider ID</TableHead>
                                <TableHead>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="cursor-help">
                                        <span className="flex items-center gap-1">
                                          Risk Score <Info className="w-3 h-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">
                                          A score from 0 to 1 indicating the model's confidence that the claim is an anomaly. Higher scores indicate a higher risk.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableHead>
                                <TableHead>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="cursor-help">
                                        <span className="flex items-center gap-1">
                                          Anomaly Type <Info className="w-3 h-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">
                                          <strong>Global:</strong> Unusual compared to the entire dataset.<br />
                                          <strong>Local:</strong> Unusual compared to its peer group.<br />
                                          <strong>Both:</strong> Anomalous in both contexts.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableHead>
                                <TableHead>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="cursor-help">
                                        <span className="flex items-center gap-1">
                                          Explanation <Info className="w-3 h-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">
                                          The top features contributing to the anomaly detection. 'Global' compares the claim to the entire dataset, while 'Local' compares it to its peer group.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableHead>              </TableRow>
            </TableHeader>
            <TableBody>
              {results.flagged_records.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{record.Claim_ID}</TableCell>
                  <TableCell>{record.Provider_ID}</TableCell>
                  <TableCell className="font-bold">{record.Combined_Score.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={record.Anomaly_Type === 'Both' ? 'destructive' : 'secondary'}>
                      {record.Anomaly_Type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {record.Global_Explanation && <div><strong>Global:</strong> {cleanExplanation(record.Global_Explanation)}</div>}
                    {record.Local_Explanation && <div><strong>Local:</strong> {cleanExplanation(record.Local_Explanation)}</div>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>.
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket />
            Advanced ML Fraud Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Run the advanced machine learning pipeline to uncover complex fraud patterns,
            identify outliers, and get deep insights into your claims data. This process may take several minutes.
          </p>
          <Button onClick={startAnalysis} disabled={isLoading}>
            {isLoading ? 'Analysis in Progress...' : 'Start ML Analysis'}
          </Button>
        </CardContent>
      </Card>

      {isLoading && status && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis is running...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={status.progress} className="w-full" />
            <div className="text-center">
              <p className="font-semibold">{status.current_message}</p>
              <p className="text-sm text-gray-500">{status.business_explanation}</p>
              <p className="text-xs text-gray-400 mt-2">Step {status.current_step} of {status.total_steps}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>An Error Occurred</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status?.status === 'completed' && status.results && renderResults(status.results)}
    </div>
  );
};

export default MLAnalysis;
