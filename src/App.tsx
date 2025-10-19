import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CompactCSVUpload from './components/CompactCSVUpload';
import DashboardLayout from './components/DashboardLayout';
import MainDashboard from './components/MainDashboard';
import ScenarioDetails from './components/ScenarioDetails';
import ProviderDetails from './components/ProviderDetails';
import MLAnalysis from './components/MLAnalysis';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'upload' | 'dashboard'>('landing');
  const [claimsData, setClaimsData] = useState<any[]>([]);
  const [anomaliesData, setAnomaliesData] = useState<any[]>([]);
  const [scenarioResults, setScenarioResults] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isRouterInitialized, setIsRouterInitialized] = useState(false);

  const handleStartUpload = () => {
    setCurrentView('upload');
  };

  const handleDataUploaded = (claims: any[], anomalies: any[], scenarioResults?: any, summary?: any) => {
    console.log("Data uploaded, navigating to dashboard", claims.length, anomalies.length);
    console.log("Claims data:", claims.slice(0, 2)); // Log first 2 claims
    console.log("Anomalies data:", anomalies.slice(0, 2)); // Log first 2 anomalies
    console.log("Scenario results:", scenarioResults);
    console.log("Summary:", summary);
    // Set data first
    setClaimsData(claims);
    setAnomaliesData(anomalies);
    setScenarioResults(scenarioResults);
    setSummary(summary);
    // Initialize router and then change view
    setIsRouterInitialized(true);
    setTimeout(() => {
      setCurrentView('dashboard');
      console.log("View changed to dashboard");
    }, 200);
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setClaimsData([]);
    setAnomaliesData([]);
    setScenarioResults(null);
    setSummary(null);
  };

  const handleBackToUpload = () => {
    setCurrentView('upload');
  };

  // Wrap the entire app in Router to ensure it's always available
  return (
    <Router>
      {currentView === 'landing' && (
        <LandingPage onStartUpload={handleStartUpload} />
      )}

      {currentView === 'upload' && (
        <CompactCSVUpload onDataUploaded={handleDataUploaded} onBack={handleBackToLanding} />
      )}

      {currentView === 'dashboard' && (
        <DashboardLayout onLogout={handleBackToUpload}>
          <Routes>
            <Route path="/" element={<MainDashboard claimsData={claimsData} anomaliesData={anomaliesData} scenarioResults={scenarioResults} summary={summary} />} />
            <Route path="/scenarios" element={<ScenarioDetails />} />
            <Route path="/ml-analysis" element={<MLAnalysis />} />
            <Route path="/provider/:id" element={<ProviderDetails claimsData={claimsData} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DashboardLayout>
      )}
    </Router>
  );
}