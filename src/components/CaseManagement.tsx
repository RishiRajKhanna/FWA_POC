import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react';

const analysts = [
  'Sarah Johnson',
  'Michael Chen',
  'Jennifer Martinez',
  'David Wilson',
  'Lisa Thompson',
  'Robert Davis',
  'Amanda Brown'
];

interface CaseManagementProps {
  anomaliesData: any[];
}

export default function CaseManagement({ anomaliesData }: CaseManagementProps) {
  // Transform anomalies into cases
  const transformAnomaliesToCases = () => {
    if (!anomaliesData.length) return [];
    
    // Group anomalies by provider to create cases
    const providerGroups: { [key: string]: any[] } = {};
    
    anomaliesData.forEach(anomaly => {
      const key = anomaly.provider_id || 'UNKNOWN';
      if (!providerGroups[key]) {
        providerGroups[key] = [];
      }
      providerGroups[key].push(anomaly);
    });

    return Object.entries(providerGroups).map(([providerId, anomalies], index) => {
      const highSeverityCount = anomalies.filter(a => a.severity === 'High').length;
      const totalAmount = anomalies.reduce((sum, a) => sum + (a.billed_amount || 0), 0);
      const avgRiskScore = anomalies.reduce((sum, a) => sum + a.risk_score, 0) / anomalies.length;
      
      return {
        id: `CASE${String(index + 1).padStart(3, '0')}`,
        title: `${anomalies[0].provider_name} - Detected Anomalies`,
        subject: `${anomalies[0].provider_name} (${providerId})`,
        assignedAnalyst: 'System Generated',
        status: highSeverityCount > 0 ? 'In Progress' : 'Open',
        priority: avgRiskScore >= 80 ? 'High' : avgRiskScore >= 60 ? 'Medium' : 'Low',
        dateCreated: new Date().toISOString().split('T')[0],
        dateUpdated: new Date().toISOString().split('T')[0],
        description: `Investigation into ${anomalies.length} detected anomalies from ${anomalies[0].provider_name}.`,
        claimsCount: anomalies.length,
        amountAtRisk: totalAmount,
        findings: `Anomaly types: ${[...new Set(anomalies.map(a => a.type))].join(', ')}`
      };
    });
  };

  const casesData = transformAnomaliesToCases();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [filteredCases, setFilteredCases] = useState(casesData);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    subject: '',
    assignedAnalyst: '',
    priority: 'medium',
    description: ''
  });

  const handleSearch = () => {
    let filtered = casesData;

    if (searchTerm) {
      filtered = filtered.filter(case_ =>
        case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.assignedAnalyst.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(case_ => 
        case_.status.toLowerCase().replace(' ', '') === statusFilter.toLowerCase()
      );
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(case_ => 
        case_.priority.toLowerCase() === priorityFilter.toLowerCase()
      );
    }

    setFilteredCases(filtered);
  };

  const handleCreateCase = () => {
    // In a real app, this would make an API call
    console.log('Creating new case:', newCase);
    setIsCreateModalOpen(false);
    setNewCase({
      title: '',
      subject: '',
      assignedAnalyst: '',
      priority: 'medium',
      description: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Open': return <Clock className="w-4 h-4 text-orange-600" />;
      case 'In Progress': return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      case 'Closed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-orange-100 text-orange-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium': return 'bg-orange-100 text-orange-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  React.useEffect(() => {
    handleSearch();
  }, [searchTerm, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-gray-900">Case Management</h1>
          <p className="text-gray-600 mt-1">Track and manage fraud investigation cases</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Cases
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create New Case
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Investigation Case</DialogTitle>
                <DialogDescription>
                  Start a new formal investigation case for potential fraud, waste, or abuse.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="case-title">Case Title</Label>
                  <Input
                    id="case-title"
                    placeholder="Brief description of the case"
                    value={newCase.title}
                    onChange={(e) => setNewCase({...newCase, title: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="case-subject">Subject (Provider/Entity)</Label>
                  <Input
                    id="case-subject"
                    placeholder="Provider name or entity under investigation"
                    value={newCase.subject}
                    onChange={(e) => setNewCase({...newCase, subject: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="case-analyst">Assigned Analyst</Label>
                    <Select value={newCase.assignedAnalyst} onValueChange={(value) => setNewCase({...newCase, assignedAnalyst: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select analyst" />
                      </SelectTrigger>
                      <SelectContent>
                        {analysts.map((analyst) => (
                          <SelectItem key={analyst} value={analyst}>
                            {analyst}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="case-priority">Priority</Label>
                    <Select value={newCase.priority} onValueChange={(value) => setNewCase({...newCase, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="case-description">Description</Label>
                  <Textarea
                    id="case-description"
                    placeholder="Detailed description of the suspected fraud, waste, or abuse..."
                    rows={4}
                    value={newCase.description}
                    onChange={(e) => setNewCase({...newCase, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCase} className="bg-blue-600 hover:bg-blue-700">
                  Create Case
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Case Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search cases, subjects, analysts..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="inprogress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm text-gray-600">Total Cases</h3>
            </div>
            <div className="text-2xl text-gray-900">{filteredCases.length}</div>
            <div className="text-sm text-gray-600">Active investigations</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-sm text-gray-600">High Priority</h3>
            </div>
            <div className="text-2xl text-red-600">
              {filteredCases.filter(c => c.priority === 'High').length}
            </div>
            <div className="text-sm text-gray-600">Urgent cases</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <h3 className="text-sm text-gray-600">In Progress</h3>
            </div>
            <div className="text-2xl text-orange-600">
              {filteredCases.filter(c => c.status === 'In Progress').length}
            </div>
            <div className="text-sm text-gray-600">Active work</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-sm text-gray-600">Closed Cases</h3>
            </div>
            <div className="text-2xl text-green-600">
              {filteredCases.filter(c => c.status === 'Closed').length}
            </div>
            <div className="text-sm text-gray-600">Completed investigations</div>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Investigation Cases</CardTitle>
          <CardDescription>Manage all active and completed fraud investigation cases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Analyst</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Claims</TableHead>
                  <TableHead>Amount at Risk</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((case_) => (
                  <TableRow key={case_.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">{case_.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{case_.title}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Updated: {case_.dateUpdated}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{case_.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {case_.assignedAnalyst}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(case_.status)}
                        <Badge className={getStatusColor(case_.status)} variant="outline">
                          {case_.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(case_.priority)}>
                        {case_.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>{case_.claimsCount}</TableCell>
                    <TableCell>{formatCurrency(case_.amountAtRisk)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {case_.dateCreated}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredCases.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No cases match your current filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}