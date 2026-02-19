import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, AlertTriangle, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const RiskLoans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      // Get all active loans and filter for overdue ones
      const response = await axios.get('/loans?status=active');
      const allLoans = response.data;
      
      // Filter loans that are overdue (more than 30 days old)
      const riskLoans = allLoans.filter(loan => {
        const loanDate = new Date(loan.loan_date);
        const daysDiff = (new Date() - loanDate) / (1000 * 60 * 60 * 24);
        return daysDiff > 30; // Consider loans older than 30 days as risk
      });
      
      setLoans(riskLoans);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load risk loans');
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan =>
    loan.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.serial_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysOverdue = (loanDate) => {
    const daysDiff = Math.floor((new Date() - new Date(loanDate)) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff - 30); // Days beyond the 30-day grace period
  };

  const getRiskLevel = (daysOverdue) => {
    if (daysOverdue <= 7) return { level: 'Low', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    if (daysOverdue <= 30) return { level: 'Medium', className: 'bg-orange-100 text-orange-800 border-orange-200' };
    return { level: 'High', className: 'bg-red-100 text-red-800 border-red-200' };
  };

  const getMetalBadge = (metal) => {
    return metal === 'Gold' 
      ? <Badge className="bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20">Gold</Badge>
      : <Badge className="bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20">Silver</Badge>;
  };

  const markAsOverdue = async (loanId) => {
    try {
      // Update loan status to overdue
      await axios.put(`/loans/${loanId}`, { status: 'overdue' });
      toast.success('Loan marked as overdue');
      fetchLoans();
    } catch (error) {
      toast.error('Failed to update loan status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Risk Loans
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor overdue and high-risk loans requiring attention
          </p>
        </div>
      </div>

      {/* Risk Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-yellow-100">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Risk Loans
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loans.length}
            </div>
          </CardHeader>
        </Card>
        
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-orange-100">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Medium Risk
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loans.filter(loan => {
                const daysOverdue = getDaysOverdue(loan.loan_date);
                return daysOverdue > 7 && daysOverdue <= 30;
              }).length}
            </div>
          </CardHeader>
        </Card>
        
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                High Risk
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {loans.filter(loan => getDaysOverdue(loan.loan_date) > 30).length}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="risk-loan-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Risk Loans Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Risk Loans ({filteredLoans.length})</CardTitle>
          <CardDescription>
            Loans requiring immediate attention or follow-up
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading risk loans...</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No risk loans found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No loans match your search criteria.' : 'All loans are performing well!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Serial No.</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Loan Date</TableHead>
                    <TableHead className="font-semibold">Days Overdue</TableHead>
                    <TableHead className="font-semibold">Risk Level</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => {
                    const daysOverdue = getDaysOverdue(loan.loan_date);
                    const risk = getRiskLevel(daysOverdue);
                    
                    return (
                      <TableRow key={loan.id} className="hover:bg-muted/50" data-testid={`risk-loan-row-${loan.id}`}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {loan.serial_no}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{loan.customer_name}</p>
                            <p className="text-sm text-muted-foreground">At Risk</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(loan.principal_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(loan.loan_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            {daysOverdue} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={risk.className}>
                            {risk.level} Risk
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {loan.items.slice(0, 1).map((item, index) => (
                              <div key={index} className="flex items-center space-x-1">
                                {getMetalBadge(item.metal)}
                                <span className="text-xs text-muted-foreground">
                                  {item.fine_weight}gm
                                </span>
                              </div>
                            ))}
                            {loan.items.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                +{loan.items.length - 1} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              data-testid={`contact-${loan.id}-btn`}
                            >
                              <Phone className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700"
                              onClick={() => markAsOverdue(loan.id)}
                              data-testid={`mark-overdue-${loan.id}-btn`}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiskLoans;