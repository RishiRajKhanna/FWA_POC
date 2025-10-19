import React from 'react';
import { Shield, Upload, Brain, Code, TrendingUp, FileSearch, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface LandingPageProps {
  onStartUpload: () => void;
}

export default function LandingPage({ onStartUpload }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-gray-900">Healthcare FWA Analytics</h1>
              <p className="text-sm text-gray-600">Fraud, Waste, and Abuse Detection Platform</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Advanced Healthcare Claims Analysis
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Detect fraud, waste, and abuse in healthcare claims using cutting-edge machine learning algorithms 
            and business rule validation. Protect your organization with intelligent anomaly detection.
          </p>
          <Button 
            onClick={onStartUpload}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <Upload className="w-5 h-5 mr-2" />
            Start Analysis
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Machine Learning Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Advanced statistical analysis and pattern recognition to identify anomalies using ML algorithms, 
                Z-score outlier detection, and provider behavior clustering.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-green-600" />
                Business Rules Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Rule-based validation using predefined thresholds, compliance checks, and healthcare-specific 
                business logic to catch known fraud patterns.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Comprehensive Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Interactive dashboards with KPI tracking, trend analysis, and detailed reporting 
                for claims analysis and provider risk assessment.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Risk Scoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Each detected anomaly is assigned a risk score to help prioritize investigations 
                and focus on the highest-impact fraud cases.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-indigo-600" />
                Provider Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Deep-dive into provider behavior, claim patterns, and historical data to identify 
                suspicious activities and billing irregularities.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                Case Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Track and manage fraud investigations with workflow management, case notes, 
                and resolution tracking for compliance reporting.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Upload Data</h3>
              <p className="text-sm text-gray-600">Upload your healthcare claims CSV file with provider and billing information</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Select Methods</h3>
              <p className="text-sm text-gray-600">Choose ML validation, business rules, or both for comprehensive analysis</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Analyze</h3>
              <p className="text-sm text-gray-600">Our algorithms process your data and identify potential anomalies and fraud patterns</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Review Results</h3>
              <p className="text-sm text-gray-600">Explore dashboards, investigate findings, and manage cases through our intuitive interface</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Ready to Start?</CardTitle>
              <CardDescription>
                Upload your healthcare claims data to begin comprehensive fraud, waste, and abuse analysis. 
                Your data is processed securely and never stored permanently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={onStartUpload}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Claims Data
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Supports CSV files with claim_id, provider_id, provider_name, billed_amount, paid_amount, service_date
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Healthcare FWA Analytics. Built for healthcare professionals and compliance officers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}