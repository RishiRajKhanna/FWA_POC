import React, { useState, useEffect } from 'react';
import { Shield, Activity, Brain, TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface AnalysisLoadingPageProps {
  onComplete?: () => void;
}

export default function AnalysisLoadingPage({ onComplete }: AnalysisLoadingPageProps) {
  const [progress, setProgress] = useState(0);
  const [currentScenario, setCurrentScenario] = useState(1);
  const [completedScenarios, setCompletedScenarios] = useState<number[]>([]);
  const [animationPhase, setAnimationPhase] = useState(0);

  // Simulate progress for visual feedback
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev; // Stop at 95% to wait for actual completion
        return prev + Math.random() * 3 + 1;
      });
    }, 800);

    const scenarioInterval = setInterval(() => {
      setCurrentScenario(prev => {
        if (prev >= 22) return prev;
        const next = prev + 1;
        setCompletedScenarios(completed => [...completed, prev]);
        return next;
      });
    }, 1200);

    const animationInterval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(scenarioInterval);
      clearInterval(animationInterval);
    };
  }, []);

  const scenarios = [
    { id: 1, name: "Benefit Outlier Detection", icon: TrendingUp, risk: "High" },
    { id: 2, name: "Chemotherapy Gap Detection", icon: Activity, risk: "High" },
    { id: 3, name: "Cross-Country Fraud Detection", icon: AlertTriangle, risk: "Critical" },
    { id: 4, name: "Sunday Claims Analysis", icon: Clock, risk: "Medium" },
    { id: 5, name: "Multiple Claims Same Invoice", icon: AlertTriangle, risk: "High" },
    { id: 6, name: "Inpatient/Outpatient Same Date", icon: Activity, risk: "High" },
    { id: 7, name: "Provider Multi-Country", icon: TrendingUp, risk: "Medium" },
    { id: 8, name: "Multiple Provider Same Date", icon: Activity, risk: "Medium" },
    { id: 9, name: "Member Multi-Currency", icon: TrendingUp, risk: "Medium" },
    { id: 10, name: "Gender-Procedure Mismatch", icon: AlertTriangle, risk: "High" },
    { id: 11, name: "Early Invoice Date", icon: Clock, risk: "High" },
    { id: 12, name: "Adult Pediatric Diagnosis", icon: Activity, risk: "High" },
    { id: 13, name: "Multiple Payee Types", icon: TrendingUp, risk: "Medium" },
    { id: 14, name: "Excessive Diagnoses", icon: Activity, risk: "Medium" },
    { id: 15, name: "Hospital Benefits Mismatch", icon: AlertTriangle, risk: "High" },
    { id: 16, name: "Veterinary Provider Claims", icon: AlertTriangle, risk: "High" },
    { id: 17, name: "Multiple MRI/CT Same Day", icon: Activity, risk: "Medium" },
    { id: 18, name: "Placeholder Scenario", icon: Clock, risk: "Low" },
    { id: 19, name: "Multiple Screenings Same Year", icon: Activity, risk: "Medium" },
    { id: 20, name: "Dialysis Without Kidney Diagnosis", icon: AlertTriangle, risk: "High" },
    { id: 21, name: "Unusual Dentistry Claims", icon: Activity, risk: "Medium" },
    { id: 22, name: "Invalid Migraine Claims", icon: TrendingUp, risk: "Medium" },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'text-red-600 bg-red-100';
      case 'High': return 'text-orange-600 bg-orange-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScenarioStatus = (scenarioId: number) => {
    if (completedScenarios.includes(scenarioId)) return 'completed';
    if (scenarioId === currentScenario) return 'processing';
    if (scenarioId < currentScenario) return 'completed';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-gray-900">Healthcare FWA Analytics</h1>
              <p className="text-sm text-gray-600">Analyzing Claims for Fraud, Waste, and Abuse</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Loading Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Main Status Card */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
            <div className="text-center mb-8">
              {/* Animated Icon */}
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className={`absolute inset-0 bg-blue-600 rounded-full animate-ping opacity-20`}></div>
                <div className={`absolute inset-2 bg-blue-500 rounded-full animate-pulse`}></div>
                <div className="absolute inset-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white animate-pulse" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Analyzing Healthcare Claims
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Running comprehensive fraud detection across 22 advanced scenarios
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600 mb-8">
                <span>Progress: {Math.round(progress)}%</span>
                <span>Scenario {currentScenario} of 22</span>
              </div>

              {/* Current Status */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-blue-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="font-medium">
                    {currentScenario <= 22 ? `Processing: ${scenarios[currentScenario - 1]?.name}` : 'Finalizing Results...'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scenarios Grid */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Fraud Detection Scenarios</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {scenarios.map((scenario) => {
                const status = getScenarioStatus(scenario.id);
                const Icon = scenario.icon;
                
                return (
                  <div 
                    key={scenario.id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      status === 'completed' 
                        ? 'bg-green-50 border-green-200' 
                        : status === 'processing'
                        ? 'bg-blue-50 border-blue-200 animate-pulse'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        status === 'completed' 
                          ? 'bg-green-100' 
                          : status === 'processing'
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}>
                        {status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : status === 'processing' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                        ) : (
                          <Icon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">#{scenario.id}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(scenario.risk)}`}>
                            {scenario.risk}
                          </span>
                        </div>
                        <p className={`text-sm font-medium truncate ${
                          status === 'completed' ? 'text-green-800' : 
                          status === 'processing' ? 'text-blue-800' : 'text-gray-600'
                        }`}>
                          {scenario.name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Educational Content */}
          <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg text-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Advanced Fraud Detection</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <div className="font-semibold mb-2">🔍 Comprehensive Analysis</div>
                <p className="text-blue-100">
                  Our system analyzes claims across 22 different fraud patterns including medical, financial, and behavioral anomalies.
                </p>
              </div>
              <div>
                <div className="font-semibold mb-2">⚡ Real-time Processing</div>
                <p className="text-blue-100">
                  Advanced algorithms process thousands of claims in seconds, identifying suspicious patterns and outliers.
                </p>
              </div>
              <div>
                <div className="font-semibold mb-2">🎯 Risk Prioritization</div>
                <p className="text-blue-100">
                  Each detected anomaly is assigned a risk score to help prioritize investigations and focus resources effectively.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}