import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Search, Filter, Download, Eye, AlertTriangle } from 'lucide-react';

interface ClaimsAnalysisProps {
  claimsData: any[];
  anomaliesData: any[];
}

export default function ClaimsAnalysis({ claimsData, anomaliesData }: ClaimsAnalysisProps) {

  
  // Transform uploaded data for display
  const transformClaimsForDisplay = () => {
    return claimsData.map(claim => {
      // Find associated anomalies for this claim
      const claimAnomalies = anomaliesData.filter(a => a.claim_id === claim.claim_id);
      const hasAnomalies = claimAnomalies.length > 0;
      
      return {
        id: claim.claim_id,
        patientName: `Patient ${claim.patient_id}`, // Anonymized for privacy
        providerId: claim.provider_id,
        providerName: claim.provider_name,
        serviceDate: claim.service_date,
        procedureCode: claim.procedure_code,
        billedAmount: claim.billed_amount,
        status: hasAnomalies ? (claimAnomalies.some(a => a.severity === 'High') ? 'Flagged' : 'Under Review') : 'Normal',
        flags: claimAnomalies.map(a => a.type),
        severity: hasAnomalies ? (claimAnomalies.some(a => a.severity === 'High') ? 'High' : 'Medium') : 'Normal'
      };
    });
  };

  const displayClaimsData = transformClaimsForDisplay();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scenarioFilter, setScenarioFilter] = useState('all');
  const [filteredClaims, setFilteredClaims] = useState(displayClaimsData);

  const handleSearch = () => {
    let filtered = displayClaimsData;

    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.procedureCode.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => 
        claim.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (scenarioFilter !== 'all') {
      filtered = filtered.filter(claim => 
        claim.flags.some(flag => flag.toLowerCase().includes(scenarioFilter.toLowerCase()))
      );
    }

    setFilteredClaims(filtered);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-orange-100 text-orange-800';
      case 'Normal': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Flagged': return 'bg-red-100 text-red-800';
      case 'Under Review': return 'bg-orange-100 text-orange-800';
      case 'Cleared': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  React.useEffect(() => {
    handleSearch();
  }, [searchTerm, statusFilter, scenarioFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Claims Analysis</h1>
          <p className="text-gray-600 mt-1">Analyze and investigate potentially fraudulent claims</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Create Case
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filtering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search claims, providers, patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="under review">Under Review</SelectItem>
                <SelectItem value="cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Scenarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scenarios</SelectItem>
                <SelectItem value="benefit">Benefit Outlier</SelectItem>
                <SelectItem value="chemotherapy">Chemotherapy Gap</SelectItem>
                <SelectItem value="cross-country">Cross-Country Fraud</SelectItem>
                <SelectItem value="sunday">Sunday Treatment</SelectItem>
                <SelectItem value="duplicate">Duplicate Invoice</SelectItem>
                <SelectItem value="conflict">Service Type Conflict</SelectItem>
                <SelectItem value="multi-country">Multi-Country Provider</SelectItem>
                <SelectItem value="overlap">Provider Overlap</SelectItem>
                <SelectItem value="currency">Multi-Currency Member</SelectItem>
                <SelectItem value="gender">Gender-Procedure Mismatch</SelectItem>
                <SelectItem value="early">Early Invoice Date</SelectItem>
                <SelectItem value="pediatric">Adult Pediatric Diagnosis</SelectItem>
                <SelectItem value="payee">Multiple Payee Types</SelectItem>
                <SelectItem value="diagnoses">Excessive Diagnoses</SelectItem>
                <SelectItem value="hospital">Hospital Benefit Mismatch</SelectItem>
                <SelectItem value="veterinary">Veterinary Provider Claims</SelectItem>
                <SelectItem value="mri">Multiple MRI/CT Same Day</SelectItem>
                <SelectItem value="placeholder">Placeholder Scenario</SelectItem>
                <SelectItem value="screenings">Multiple Screenings Same Year</SelectItem>
                <SelectItem value="dialysis">Dialysis Without Kidney Diagnosis</SelectItem>
                <SelectItem value="dentistry">Unusual Dentistry Claims</SelectItem>
                <SelectItem value="migraine">Invalid Migraine Claims</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl text-gray-900">{filteredClaims.length}</div>
              <div className="text-sm text-gray-600">Total Claims</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-red-600">
                {filteredClaims.filter(c => c.status === 'Flagged').length}
              </div>
              <div className="text-sm text-gray-600">Flagged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-orange-600">
                {filteredClaims.filter(c => c.status === 'Under Review').length}
              </div>
              <div className="text-sm text-gray-600">Under Review</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-gray-900">
                {formatCurrency(filteredClaims.reduce((sum, claim) => sum + claim.billedAmount, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>Claims Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service Date</TableHead>
                  <TableHead>Procedure</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <TableRow key={claim.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{claim.id}</TableCell>
                    <TableCell>{claim.patientName}</TableCell>
                    <TableCell>
                      <Link 
                        to={`/provider/${claim.providerId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {claim.providerName}
                      </Link>
                    </TableCell>
                    <TableCell>{claim.serviceDate}</TableCell>
                    <TableCell className="font-mono">{claim.procedureCode}</TableCell>
                    <TableCell>{formatCurrency(claim.billedAmount)}</TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(claim.severity)}>
                        {claim.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(claim.status)} variant="outline">
                        {claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {claim.flags.map((flag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {claim.status === 'Flagged' && (
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredClaims.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No claims match your current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}