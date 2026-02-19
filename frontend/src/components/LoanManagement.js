import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Calendar, 
  Weight, 
  TrendingUp,
  CreditCard,
  Eye,
  Trash2,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const LoanManagement = () => {
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [interestInfo, setInterestInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [loanForm, setLoanForm] = useState({
    customer_id: '',
    customer_name: '',
    principal_amount: '',
    loan_date: new Date().toISOString().split('T')[0],
    items: [{
      qty: 1,
      item_name: '',
      metal: 'Gold',
      weight: '',
      percentage: '',
      fine_weight: '',
      value: ''
    }]
  });

  useEffect(() => {
    Promise.all([
      fetchLoans(),
      fetchCustomers()
    ]);
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await axios.get('/loans');
      setLoans(response.data);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setLoanForm(prev => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer ? customer.name : ''
    }));
  };

  const addItem = () => {
    setLoanForm(prev => ({
      ...prev,
      items: [...prev.items, {
        qty: 1,
        item_name: '',
        metal: 'Gold',
        weight: '',
        percentage: '',
        fine_weight: '',
        value: ''
      }]
    }));
  };

  const removeItem = (index) => {
    if (loanForm.items.length > 1) {
      setLoanForm(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index, field, value) => {
    setLoanForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateFineWeight = (index) => {
    const item = loanForm.items[index];
    const weight = parseFloat(item.weight) || 0;
    const percentage = parseFloat(item.percentage) || 0;
    const fineWeight = (weight * percentage) / 100;
    
    updateItem(index, 'fine_weight', fineWeight.toFixed(3));
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const loanData = {
        ...loanForm,
        principal_amount: parseFloat(loanForm.principal_amount),
        loan_date: new Date(loanForm.loan_date).toISOString(),
        items: loanForm.items.map(item => ({
          ...item,
          qty: parseInt(item.qty),
          weight: parseFloat(item.weight),
          percentage: parseFloat(item.percentage),
          fine_weight: parseFloat(item.fine_weight),
          value: parseFloat(item.value)
        }))
      };

      await axios.post('/loans', loanData);
      toast.success('Loan created successfully!');
      setShowCreateDialog(false);
      resetForm();
      fetchLoans();
    } catch (error) {
      console.error('Error creating loan:', error);
      toast.error(error.response?.data?.detail || 'Failed to create loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setLoanForm({
      customer_id: '',
      customer_name: '',
      principal_amount: '',
      loan_date: new Date().toISOString().split('T')[0],
      items: [{
        qty: 1,
        item_name: '',
        metal: 'Gold',
        weight: '',
        percentage: '',
        fine_weight: '',
        value: ''
      }]
    });
  };

  const calculateInterest = async (loan) => {
    try {
      const response = await axios.get(`/loans/${loan.id}/interest`);
      setInterestInfo(response.data);
      setSelectedLoan(loan);
      setShowInterestDialog(true);
    } catch (error) {
      console.error('Error calculating interest:', error);
      toast.error('Failed to calculate interest');
    }
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         loan.serial_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'closed':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Closed</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMetalBadge = (metal) => {
    return metal === 'Gold' 
      ? <Badge className="bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20">Gold</Badge>
      : <Badge className="bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20">Silver</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Loan Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage gold and silver loans with interest calculations
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#C5A059] hover:bg-[#B08D45] text-white transition-button"
              data-testid="create-loan-btn"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Loan</DialogTitle>
              <DialogDescription>
                Enter loan details and collateral information
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateLoan} className="space-y-6 pt-4">
              {/* Basic Loan Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select onValueChange={handleCustomerChange} required>
                    <SelectTrigger data-testid="loan-customer-select">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="principal_amount">Principal Amount (₹) *</Label>
                  <Input
                    id="principal_amount"
                    type="number"
                    placeholder="Enter loan amount"
                    value={loanForm.principal_amount}
                    onChange={(e) => setLoanForm(prev => ({ ...prev, principal_amount: e.target.value }))}
                    required
                    data-testid="loan-amount-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="loan_date">Loan Date *</Label>
                  <Input
                    id="loan_date"
                    type="date"
                    value={loanForm.loan_date}
                    onChange={(e) => setLoanForm(prev => ({ ...prev, loan_date: e.target.value }))}
                    required
                    data-testid="loan-date-input"
                  />
                </div>
              </div>

              <Separator />

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Collateral Items</h3>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addItem}
                    data-testid="add-item-btn"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                
                {loanForm.items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Item #{index + 1}</h4>
                      {loanForm.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`remove-item-${index}-btn`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', e.target.value)}
                          required
                          data-testid={`item-${index}-qty-input`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Item Name *</Label>
                        <Input
                          placeholder="e.g., Gold Chain, Silver Ring"
                          value={item.item_name}
                          onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                          required
                          data-testid={`item-${index}-name-input`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Metal Type *</Label>
                        <Select value={item.metal} onValueChange={(value) => updateItem(index, 'metal', value)}>
                          <SelectTrigger data-testid={`item-${index}-metal-select`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Gold">Gold</SelectItem>
                            <SelectItem value="Silver">Silver</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Weight (gm) *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={item.weight}
                          onChange={(e) => updateItem(index, 'weight', e.target.value)}
                          required
                          data-testid={`item-${index}-weight-input`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Purity (%) *</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="95.0"
                            value={item.percentage}
                            onChange={(e) => updateItem(index, 'percentage', e.target.value)}
                            required
                            data-testid={`item-${index}-purity-input`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => calculateFineWeight(index)}
                            data-testid={`calc-fine-weight-${index}-btn`}
                          >
                            Calc
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Fine Weight (gm) *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={item.fine_weight}
                          onChange={(e) => updateItem(index, 'fine_weight', e.target.value)}
                          required
                          data-testid={`item-${index}-fine-weight-input`}
                        />
                      </div>
                      
                      <div className="space-y-2 md:col-span-3">
                        <Label>Item Value (₹) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.value}
                          onChange={(e) => updateItem(index, 'value', e.target.value)}
                          required
                          data-testid={`item-${index}-value-input`}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="cancel-loan-btn"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                  disabled={isSubmitting}
                  data-testid="save-loan-btn"
                >
                  {isSubmitting ? 'Creating Loan...' : 'Create Loan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer name or serial number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="loan-search-input"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="loan-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>All Loans ({filteredLoans.length})</CardTitle>
          <CardDescription>
            Manage your loan portfolio with interest calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading loans...</p>
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No loans found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'all' ? 'No loans match your search criteria.' : 'Start by creating your first loan.'}
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
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Items</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLoans.map((loan) => (
                    <TableRow key={loan.id} className="hover:bg-muted/50" data-testid={`loan-row-${loan.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {loan.serial_no}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{loan.customer_name}</p>
                          <p className="text-sm text-muted-foreground">Borrower</p>
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
                      <TableCell>
                        {getStatusBadge(loan.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => calculateInterest(loan)}
                            data-testid={`calc-interest-${loan.id}-btn`}
                          >
                            <Calculator className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interest Calculation Dialog */}
      <Dialog open={showInterestDialog} onOpenChange={setShowInterestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Interest Calculation</DialogTitle>
            <DialogDescription>
              Loan #{selectedLoan?.serial_no} - {selectedLoan?.customer_name}
            </DialogDescription>
          </DialogHeader>
          
          {interestInfo && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Principal Amount</Label>
                  <p className="text-lg font-semibold">{formatCurrency(interestInfo.principal)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Interest ({interestInfo.interest_type})</Label>
                  <p className="text-lg font-semibold text-[#C5A059]">{formatCurrency(interestInfo.interest)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <Label className="text-sm text-muted-foreground">Total Amount</Label>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(interestInfo.total_amount)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {interestInfo.days} days • {interestInfo.interest_type} interest
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanManagement;