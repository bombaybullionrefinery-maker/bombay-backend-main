import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Calendar, Archive, Calculator, TrendingUp, Eye } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const ReleasedLoans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [interestInfo, setInterestInfo] = useState({});

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await axios.get('/loans?status=closed');
      const closedLoans = response.data;
      
      // Calculate interest for all closed loans
      const loansWithInterest = await Promise.all(
        closedLoans.map(async (loan) => {
          try {
            const interestResponse = await axios.get(`/loans/${loan.id}/interest`);
            return {
              ...loan,
              interestInfo: interestResponse.data
            };
          } catch (error) {
            console.error(`Error calculating interest for loan ${loan.id}:`, error);
            return {
              ...loan,
              interestInfo: {
                principal: loan.principal_amount,
                interest: 0,
                total_amount: loan.principal_amount,
                days: 0,
                interest_type: 'simple'
              }
            };
          }
        })
      );
      
      setLoans(loansWithInterest);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load released loans');
    } finally {
      setLoading(false);
    }
  };

  const viewLoanDetails = (loan) => {
    setSelectedLoan(loan);
    setShowDetailsDialog(true);
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

  const getMetalBadge = (metal) => {
    return metal === 'Gold' 
      ? <Badge className="bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20">Gold</Badge>
      : <Badge className="bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20">Silver</Badge>;
  };

  const totalReleasedAmount = filteredLoans.reduce((sum, loan) => sum + loan.principal_amount, 0);
  const totalInterestEarned = filteredLoans.reduce((sum, loan) => sum + (loan.interestInfo?.interest || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Released Loans
          </h1>
          <p className="text-muted-foreground mt-2">
            Archive of all closed and released loans with interest calculations
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-green-100">
                <Archive className="h-4 w-4 text-green-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Released Loans
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {filteredLoans.length}
            </div>
          </CardHeader>
        </Card>
        
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Principal
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalReleasedAmount)}
            </div>
          </CardHeader>
        </Card>
        
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#C5A059]/20">
                <Calculator className="h-4 w-4 text-[#C5A059]" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Interest Earned
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-[#C5A059]">
              {formatCurrency(totalInterestEarned)}
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
              data-testid="released-loan-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Released Loans Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Released Loans ({filteredLoans.length})</CardTitle>
          <CardDescription>
            All loans that have been closed with principal and interest details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading released loans...</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Archive className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No released loans found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No loans match your search criteria.' : 'No loans have been released yet.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Serial No.</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold text-right">Principal Amount</TableHead>
                    <TableHead className="font-semibold text-right">Interest Earned</TableHead>
                    <TableHead className="font-semibold text-right">Total Amount</TableHead>
                    <TableHead className="font-semibold">Loan Date</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id} className="hover:bg-muted/50" data-testid={`released-loan-row-${loan.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {loan.serial_no}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{loan.customer_name}</p>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">Released</Badge>
                            {loan.interestInfo?.interest_type && (
                              <Badge variant="outline" className="text-xs">
                                {loan.interestInfo.interest_type} interest
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(loan.principal_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-green-600">
                          {loan.interestInfo ? formatCurrency(loan.interestInfo.interest) : '₹0'}
                        </div>
                        {loan.interestInfo && (
                          <div className="text-xs text-muted-foreground">
                            {loan.interestInfo.days} days
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {loan.interestInfo ? formatCurrency(loan.interestInfo.total_amount) : formatCurrency(loan.principal_amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(loan.loan_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {loan.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="flex items-center space-x-1">
                              {getMetalBadge(item.metal)}
                              <span className="text-xs text-muted-foreground">
                                {item.fine_weight}gm
                              </span>
                            </div>
                          ))}
                          {loan.items.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{loan.items.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewLoanDetails(loan)}
                          data-testid={`view-details-${loan.id}-btn`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loan Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loan Details - {selectedLoan?.serial_no}</DialogTitle>
            <DialogDescription>
              Complete information for released loan
            </DialogDescription>
          </DialogHeader>
          
          {selectedLoan && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Customer Information</h4>
                  <p className="text-lg font-medium">{selectedLoan.customer_name}</p>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Loan Date: {formatDate(selectedLoan.loan_date)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Financial Summary</h4>
                  <Badge className="bg-gray-100 text-gray-800 border-gray-200">Released</Badge>
                </div>
              </div>

              {/* Interest Calculation */}
              {selectedLoan.interestInfo && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Interest Calculation</h4>
                  <div className="grid grid-cols-3 gap-4 text-center p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="font-semibold text-lg">{formatCurrency(selectedLoan.interestInfo.principal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest ({selectedLoan.interestInfo.interest_type})</p>
                      <p className="font-semibold text-lg text-green-600">{formatCurrency(selectedLoan.interestInfo.interest)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-bold text-xl text-[#C5A059]">{formatCurrency(selectedLoan.interestInfo.total_amount)}</p>
                    </div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {selectedLoan.interestInfo.days} days \u2022 {selectedLoan.interestInfo.interest_type} interest calculation
                  </p>
                </div>
              )}

              {/* Collateral Items */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">Collateral Items ({selectedLoan.items.length})</h4>
                <div className="grid gap-3">
                  {selectedLoan.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{item.qty}x {item.item_name}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            {getMetalBadge(item.metal)}
                            <span>{item.weight}gm \u2022 {item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.value)}</p>
                        <p className="text-sm text-muted-foreground">Fine: {item.fine_weight}gm</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Total Collateral Value</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedLoan.items.reduce((sum, item) => sum + item.value, 0))}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReleasedLoans;