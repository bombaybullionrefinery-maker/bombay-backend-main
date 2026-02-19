import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Calendar, 
  DollarSign,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paymentForm, setPaymentForm] = useState({
    loan_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    Promise.all([
      fetchPayments(),
      fetchLoans()
    ]);
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await axios.get('/payments');
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await axios.get('/loans?status=active');
      setLoans(response.data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const paymentData = {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
        payment_date: new Date(paymentForm.payment_date).toISOString()
      };

      await axios.post('/payments', paymentData);
      toast.success('Payment recorded successfully!');
      setShowCreateDialog(false);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPaymentForm({
      loan_id: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const filteredPayments = payments.filter(payment =>
    payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.loan_serial_no.toLowerCase().includes(searchTerm.toLowerCase())
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

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Payment Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Record and track cash payments received
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#C5A059] hover:bg-[#B08D45] text-white transition-button"
              data-testid="record-payment-btn"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a cash payment received from customer
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreatePayment} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="loan">Select Loan *</Label>
                <Select 
                  value={paymentForm.loan_id} 
                  onValueChange={(value) => setPaymentForm(prev => ({ ...prev, loan_id: value }))}
                  required
                >
                  <SelectTrigger data-testid="payment-loan-select">
                    <SelectValue placeholder="Choose active loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {loans.map(loan => (
                      <SelectItem key={loan.id} value={loan.id}>
                        {loan.serial_no} - {loan.customer_name} ({formatCurrency(loan.principal_amount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Payment Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter payment amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  data-testid="payment-amount-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                  required
                  data-testid="payment-date-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this payment"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  data-testid="payment-notes-input"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="cancel-payment-btn"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                  disabled={isSubmitting}
                  data-testid="save-payment-btn"
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="rounded-xl shadow-sm" data-testid="total-payments-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-green-100">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Payments
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalPayments)}
            </div>
          </CardHeader>
        </Card>
        
        <Card className="rounded-xl shadow-sm" data-testid="payments-count-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <Receipt className="h-4 w-4 text-blue-600" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Payment Records
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {payments.length}
            </div>
          </CardHeader>
        </Card>
        
        <Card className="rounded-xl shadow-sm" data-testid="avg-payment-card">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#C5A059]/20">
                <DollarSign className="h-4 w-4 text-[#C5A059]" />
              </div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Payment
              </CardTitle>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(payments.length > 0 ? totalPayments / payments.length : 0)}
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
              placeholder="Search by customer name or loan serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="payment-search-input"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Payment History ({filteredPayments.length})</CardTitle>
          <CardDescription>
            All cash payments received from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading payments...</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Receipt className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No payments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No payments match your search criteria.' : 'Start by recording your first payment.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Loan</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/50" data-testid={`payment-row-${payment.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {payment.loan_serial_no}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{payment.customer_name}</p>
                          <p className="text-sm text-muted-foreground">Borrower</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(payment.payment_date)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {payment.notes || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 capitalize">
                          {payment.payment_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentManagement;