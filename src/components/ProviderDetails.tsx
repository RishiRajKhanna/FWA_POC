import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  AlertTriangle,
  TrendingUp,
  FileText,
  Eye,
  Calendar
} from 'lucide-react';

// Mock provider data
const providersData = {
  P001: {
    id: 'P001',
    name: 'Metro Medical Center',
    address: '123 Healthcare Blvd, Medical City, MC 12345',
    phone: '(555) 123-4567',
    email: 'admin@metromedical.com',
    npi: '1234567890',
    riskScore: 94,
    status: 'High Risk',
    licenseNumber: 'HC-2024-001',
    specialties: ['Internal Medicine', 'Cardiology', 'Emergency Medicine'],
    joinDate: '2018-03-15'
  },
  P002: {
    id: 'P002',
    name: 'Sunrise Healthcare',
    address: '456 Wellness Ave, Health Town, HT 67890',
    phone: '(555) 987-6543',
    email: 'contact@sunrisehc.com',
    npi: '0987654321',
    riskScore: 89,
    status: 'High Risk',
    licenseNumber: 'HC-2024-002',
    specialties: ['Family Medicine', 'Pediatrics'],
    joinDate: '2019-07-22'
  }
};

const riskHistoryData = [
  { month: 'Jan', score: 65 },
  { month: 'Feb', score: 68 },
  { month: 'Mar', score: 72 },
  { month: 'Apr', score: 78 },
  { month: 'May', score: 85 },
  { month: 'Jun', score: 91 },
  { month: 'Jul', score: 94 }
];

const claimsData = [
  {
    id: 'CLM001',
    patientName: 'John Smith',
    serviceDate: '2024-01-15',
    procedureCode: '99213',
    billedAmount: 450.00,
    riskScore: 94,
    status: 'Flagged',
    flags: ['Duplicate', 'Outlier Amount']
  },
  {
    id: 'CLM004',
    patientName: 'Emily Davis',
    serviceDate: '2024-01-12',
    procedureCode: '99213',
    billedAmount: 480.00,
    riskScore: 85,
    status: 'Flagged',
    flags: ['Duplicate', 'High Amount']
  },
  {
    id: 'CLM009',
    patientName: 'Mark Johnson',
    serviceDate: '2024-01-10',
    procedureCode: '71020',
    billedAmount: 320.00,
    riskScore: 78,
    status: 'Under Review',
    flags: ['Unusual Pattern']
  },
  {
    id: 'CLM010',
    patientName: 'Susan Williams',
    serviceDate: '2024-01-08',
    procedureCode: '93000',
    billedAmount: 290.00,
    riskScore: 75,
    status: 'Flagged',
    flags: ['Frequent Provider']
  }
];

const monthlyClaimsData = [
  { month: 'Jan', claims: 142, flagged: 23 },
  { month: 'Feb', claims: 156, flagged: 28 },
  { month: 'Mar', claims: 134, flagged: 19 },
  { month: 'Apr', claims: 189, flagged: 34 },
  { month: 'May', claims: 203, flagged: 42 },
  { month: 'Jun', claims: 178, flagged: 38 },
  { month: 'Jul', claims: 165, flagged: 45 }
];

interface ProviderDetailsProps {
  claimsData: any[];
}

export default function ProviderDetails({ claimsData }: ProviderDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const provider = id ? providersData[id as keyof typeof providersData] : null;

  if (!provider) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-2xl text-gray-900 mb-2">Provider Not Found</h2>
          <p className="text-gray-600 mb-4">The requested provider could not be found.</p>
          <Link to="/claims">
            <Button>Back to Claims</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 85) return 'bg-red-100 text-red-800';
    if (score >= 70) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Flagged': return 'bg-red-100 text-red-800';
      case 'Under Review': return 'bg-orange-100 text-orange-800';
      case 'Cleared': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/claims">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Claims
          </Button>
        </Link>
        <div className="h-6 w-px bg-gray-300" />
        <div>
          <h1 className="text-3xl text-gray-900">Provider Details</h1>
          <p className="text-gray-600 mt-1">Comprehensive analysis and risk assessment</p>
        </div>
      </div>

      {/* Provider Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{provider.name}</CardTitle>
              <CardDescription className="text-base mt-2">Provider ID: {provider.id}</CardDescription>
            </div>
            <div className="text-right">
              <Badge className={`${getRiskScoreColor(provider.riskScore)} text-lg px-3 py-1`}>
                Risk Score: {provider.riskScore}
              </Badge>
              <div className="mt-2">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {provider.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-600 mb-2">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {provider.address}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {provider.phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {provider.email}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm text-gray-600 mb-2">Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {provider.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-600 mb-2">License Information</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600">NPI:</span> {provider.npi}</div>
                  <div><span className="text-gray-600">License #:</span> {provider.licenseNumber}</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Joined:</span> {provider.joinDate}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="bg-blue-600 hover:bg-blue-700 flex-1">
                  Create Investigation
                </Button>
                <Button variant="outline" className="flex-1">
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk History */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Score History</CardTitle>
            <CardDescription>How this provider's risk score has changed over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskHistoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#dc2626" 
                    strokeWidth={3}
                    dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Claims Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Claims Volume</CardTitle>
            <CardDescription>Total vs flagged claims by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyClaimsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Bar dataKey="claims" fill="#3b82f6" name="Total Claims" />
                  <Bar dataKey="flagged" fill="#dc2626" name="Flagged Claims" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm text-gray-600">Total Claims</h3>
            </div>
            <div className="text-2xl text-gray-900">1,167</div>
            <div className="text-sm text-gray-600">Last 6 months</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-sm text-gray-600">Flagged Claims</h3>
            </div>
            <div className="text-2xl text-red-600">229</div>
            <div className="text-sm text-gray-600">19.6% of total</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-sm text-gray-600">Total Billed</h3>
            </div>
            <div className="text-2xl text-gray-900">$487,320</div>
            <div className="text-sm text-gray-600">Last 6 months</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm text-gray-600">Amount at Risk</h3>
            </div>
            <div className="text-2xl text-orange-600">$95,640</div>
            <div className="text-sm text-gray-600">Flagged claims</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Flagged Claims */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Flagged Claims</CardTitle>
          <CardDescription>Latest claims from this provider that triggered risk alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Service Date</TableHead>
                <TableHead>Procedure</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claimsData.map((claim) => (
                <TableRow key={claim.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">{claim.id}</TableCell>
                  <TableCell>{claim.patientName}</TableCell>
                  <TableCell>{claim.serviceDate}</TableCell>
                  <TableCell className="font-mono">{claim.procedureCode}</TableCell>
                  <TableCell>{formatCurrency(claim.billedAmount)}</TableCell>
                  <TableCell>
                    <Badge className={getRiskScoreColor(claim.riskScore)}>
                      {claim.riskScore}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(claim.status)} variant="outline">
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
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}