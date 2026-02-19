import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp,
  Plus,
  ArrowUpRight,
  Calendar,
  Weight,
  AlertTriangle,
  Archive,
  Target,
  PieChart,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('all'); // daily, monthly, yearly, all
  const [realTimeCashInHand, setRealTimeCashInHand] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    
    // Load real-time cash in hand
    const savedCashInHand = parseFloat(localStorage.getItem('cashInHand') || '0');
    setRealTimeCashInHand(savedCashInHand);
    
    // Listen for cash in hand updates
    const handleCashUpdate = (event) => {
      setRealTimeCashInHand(event.detail.newAmount);
    };
    
    window.addEventListener('cashInHandUpdated', handleCashUpdate);
    
    return () => {
      window.removeEventListener('cashInHandUpdated', handleCashUpdate);
    };
  }, [timeFilter]);

  const fetchDashboardData = async () => {
    try {
      const [dashboardResponse, loansResponse, paymentsResponse] = await Promise.all([
        axios.get('/dashboard'),
        axios.get('/loans'),
        axios.get('/payments')
      ]);
      
      const allLoans = loansResponse.data;
      const allPayments = paymentsResponse.data;
      
      // Calculate enhanced statistics
      const enhancedStats = {
        ...dashboardResponse.data,
        
        // Loan status breakdown
        activeLoans: allLoans.filter(loan => loan.status === 'active').length,
        releasedLoans: allLoans.filter(loan => loan.status === 'closed').length,
        overdueLoans: allLoans.filter(loan => {
          const daysDiff = (new Date() - new Date(loan.loan_date)) / (1000 * 60 * 60 * 24);
          return loan.status === 'active' && daysDiff > 30;
        }).length,
        
        // Financial metrics
        totalLoanAmount: allLoans.reduce((sum, loan) => sum + loan.principal_amount, 0),
        activeLoanAmount: allLoans
          .filter(loan => loan.status === 'active')
          .reduce((sum, loan) => sum + loan.principal_amount, 0),
        totalPaymentsReceived: allPayments.reduce((sum, payment) => sum + payment.amount, 0),
        
        // Time-based data
        dailyStats: calculateTimeStats(allLoans, allPayments, 'daily'),
        monthlyStats: calculateTimeStats(allLoans, allPayments, 'monthly'),
        yearlyStats: calculateTimeStats(allLoans, allPayments, 'yearly'),
        
        // Metal-wise breakdown
        goldLoans: allLoans.filter(loan => 
          loan.items.some(item => item.metal === 'Gold')
        ).length,
        silverLoans: allLoans.filter(loan => 
          loan.items.some(item => item.metal === 'Silver')
        ).length,
        
        // Interest metrics
        totalInterestEarnable: calculateTotalInterest(allLoans),
      };
      
      setStats(enhancedStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeStats = (loans, payments, period) => {
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return { loans: 0, payments: 0, amount: 0 };
    }
    
    const periodLoans = loans.filter(loan => new Date(loan.loan_date) >= startDate);
    const periodPayments = payments.filter(payment => new Date(payment.payment_date) >= startDate);
    
    return {
      loans: periodLoans.length,
      payments: periodPayments.length,
      amount: periodPayments.reduce((sum, payment) => sum + payment.amount, 0)
    };
  };

  const calculateTotalInterest = (loans) => {
    // Simplified interest calculation - in real implementation, this would be more complex
    return loans
      .filter(loan => loan.status === 'active')
      .reduce((total, loan) => {
        const daysDiff = (new Date() - new Date(loan.loan_date)) / (1000 * 60 * 60 * 24);
        const monthlyRate = 0.02; // Assume 2% monthly
        const months = daysDiff / 30;
        return total + (loan.principal_amount * monthlyRate * months);
      }, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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

  const currentPeriodStats = stats?.[`${timeFilter}Stats`] || { loans: 0, payments: 0, amount: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Business Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive overview of your loan portfolio and financial metrics
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
            {[
              { key: 'daily', label: 'Today' },
              { key: 'monthly', label: 'Month' },
              { key: 'yearly', label: 'Year' },
              { key: 'all', label: 'All Time' }
            ].map(filter => (
              <Button
                key={filter.key}
                variant={timeFilter === filter.key ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeFilter(filter.key)}
                className={timeFilter === filter.key ? 'bg-white shadow-sm' : ''}
              >
                {filter.label}
              </Button>
            ))}
          </div>
          
          <Button 
            className="bg-[#C5A059] hover:bg-[#B08D45] text-white transition-button" 
            onClick={() => navigate('/loans/create')}
            data-testid="create-loan-quick-btn"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Total Active Loans */}
        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200" data-testid="active-loans-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Loans
                </CardTitle>
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats?.activeLoans || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(stats?.activeLoanAmount || 0)} outstanding
            </p>
          </CardHeader>
        </Card>

        {/* Released Loans */}
        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Archive className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Released Loans
                </CardTitle>
              </div>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats?.releasedLoans || 0}
            </div>
            <p className="text-sm text-green-600 font-medium">
              Completed successfully
            </p>
          </CardHeader>
        </Card>

        {/* Risk Loans */}
        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Risk Loans
                </CardTitle>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {stats?.overdueLoans || 0}
            </div>
            <p className="text-sm text-red-600 font-medium">
              Require attention
            </p>
          </CardHeader>
        </Card>

        {/* Cash in Hand */}
        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200" data-testid="cash-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-[#C5A059]/20">
                  <DollarSign className="h-5 w-5 text-[#C5A059]" />
                </div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Cash in Hand
                </CardTitle>
              </div>
              <DollarSign className="h-4 w-4 text-[#C5A059]" />
            </div>
            <div className="text-3xl font-bold text-foreground">
              {formatCurrency(realTimeCashInHand)}
            </div>
            <p className="text-sm text-muted-foreground">
              Available balance (real-time)
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Total Customers</span>
            </CardTitle>
            <div className="text-2xl font-bold text-foreground">
              {stats?.total_customers || 0}
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <PieChart className="h-4 w-4" />
              <span>Gold Loans</span>
            </CardTitle>
            <div className="text-2xl font-bold text-[#C5A059]">
              {stats?.goldLoans || 0}
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Silver Loans</span>
            </CardTitle>
            <div className="text-2xl font-bold text-[#94A3B8]">
              {stats?.silverLoans || 0}
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interest Potential
            </CardTitle>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalInterestEarnable || 0)}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Period Statistics */}
      {timeFilter !== 'all' && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>{timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)} Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{currentPeriodStats.loans}</div>
                <p className="text-sm text-muted-foreground">New Loans Created</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{currentPeriodStats.payments}</div>
                <p className="text-sm text-muted-foreground">Payments Received</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#C5A059]">{formatCurrency(currentPeriodStats.amount)}</div>
                <p className="text-sm text-muted-foreground">Payment Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity - Wide Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Loans */}
        <Card className="col-span-1 rounded-xl shadow-sm" data-testid="recent-loans-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Loans</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#C5A059] hover:text-[#B08D45] hover:bg-[#C5A059]/10"
                onClick={() => navigate('/loans/active')}
                data-testid="view-all-loans-btn"
              >
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.recent_loans?.length > 0 ? (
              stats.recent_loans.slice(0, 5).map((loan, index) => (
                <div key={loan.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-[#C5A059]/10">
                      <Weight className="h-4 w-4 text-[#C5A059]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{loan.customer_name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">{loan.serial_no}</Badge>
                        <Badge className={`text-xs ${
                          loan.status === 'active' ? 'bg-green-100 text-green-800' : 
                          loan.status === 'closed' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {loan.status === 'active' ? 'Active' : loan.status === 'closed' ? 'Released' : 'Overdue'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(loan.principal_amount)}</p>
                    <p className="text-xs text-muted-foreground flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(loan.loan_date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent loans</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="col-span-1 rounded-xl shadow-sm" data-testid="recent-payments-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Payments</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[#C5A059] hover:text-[#B08D45] hover:bg-[#C5A059]/10"
                onClick={() => navigate('/payments')}
                data-testid="view-all-payments-btn"
              >
                View all
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats?.recent_payments?.length > 0 ? (
              stats.recent_payments.slice(0, 5).map((payment, index) => (
                <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-green-100">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{payment.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{payment.loan_serial_no}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-green-600">+{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(payment.payment_date)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent payments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;