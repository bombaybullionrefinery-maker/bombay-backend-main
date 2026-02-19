import React, { useState } from 'react';
import { useAuth } from '../App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  DollarSign, 
  Menu, 
  LogOut,
  Building2,
  Settings,
  AlertTriangle,
  Archive,
  X,
  Calendar,
  Weight
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Add Loan', href: '/loans/create', icon: CreditCard },
    { name: 'Active Loans', href: '/loans/active', icon: CreditCard },
    { name: 'Released Loans', href: '/loans/released', icon: Archive },
    { name: 'Risk Loans', href: '/loans/risk', icon: AlertTriangle },
    { name: 'Payments', href: '/payments', icon: DollarSign },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  // Function to handle global search from child components
  const handleGlobalSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    
    setSearchLoading(true);
    try {
      // Search in loans first
      const loansResponse = await axios.get('/loans');
      const allLoans = loansResponse.data;
      
      const foundLoan = allLoans.find(loan => 
        loan.serial_no.toLowerCase() === searchTerm.toLowerCase() ||
        loan.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (foundLoan) {
        // Get interest calculation for the loan
        try {
          const interestResponse = await axios.get(`/loans/${foundLoan.id}/interest`);
          foundLoan.interestInfo = interestResponse.data;
        } catch (e) {
          console.log('Could not calculate interest:', e);
        }
        
        setSearchResults(foundLoan);
        setShowSearchDialog(true);
      } else {
        // Search in customers
        const customersResponse = await axios.get('/customers');
        const allCustomers = customersResponse.data;
        
        const foundCustomer = allCustomers.find(customer => 
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm)
        );
        
        if (foundCustomer) {
          navigate(`/customers?search=${encodeURIComponent(searchTerm)}`);
        } else {
          toast.error('No results found for your search');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

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
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Released</Badge>;
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

  const navigateToLoanPage = (loan) => {
    const basePath = loan.status === 'active' ? '/loans/active' : 
                    loan.status === 'closed' ? '/loans/released' : '/loans/risk';
    navigate(`${basePath}?search=${loan.serial_no}`);
    setShowSearchDialog(false);
  };

  const Sidebar = ({ className = '' }) => (
    <div className={`flex flex-col h-full bg-white border-r ${className}`}>
      {/* Header */}
      <div className="p-4 lg:p-6 border-b">
        <div className="flex items-center space-x-2 lg:space-x-3">
          <div className="p-1.5 lg:p-2 rounded-lg bg-[#C5A059]/10">
            <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-[#C5A059]" />
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-foreground">Bombay Finance</h2>
            <p className="text-xs lg:text-sm text-muted-foreground">Loan Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 lg:space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Button
              key={item.name}
              variant={isActive ? 'default' : 'ghost'}
              className={`w-full justify-start transition-button text-xs lg:text-sm py-2 lg:py-2.5 ${
                isActive 
                  ? 'bg-[#C5A059] hover:bg-[#B08D45] text-white' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              onClick={() => navigate(item.href)}
              data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}-btn`}
            >
              <item.icon className="mr-2 lg:mr-3 h-4 w-4" />
              <span className="truncate">{item.name}</span>
            </Button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 lg:p-4 border-t">
        <div className="flex items-center space-x-2 lg:space-x-3 mb-3 lg:mb-4">
          <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
            <AvatarFallback className="bg-[#C5A059]/10 text-[#C5A059] font-semibold text-xs lg:text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs lg:text-sm font-medium text-foreground truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start transition-button text-xs lg:text-sm z-50 relative" 
          onClick={handleLogout}
          data-testid="logout-btn"
        >
          <LogOut className="mr-2 lg:mr-3 h-3 w-3 lg:h-4 lg:w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 lg:w-72 md:flex-col">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-lg bg-[#C5A059]/10">
              <Building2 className="h-4 w-4 text-[#C5A059]" />
            </div>
            <h2 className="text-sm font-bold text-foreground">Bombay Finance</h2>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" data-testid="mobile-menu-btn">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search Results Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-xl lg:max-w-2xl mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base lg:text-lg">
              <span>Loan Details - {searchResults?.serial_no}</span>
              <Button variant="ghost" size="sm" onClick={() => setShowSearchDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {searchResults && (
            <div className="space-y-4 lg:space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-sm lg:text-base">Customer Information</h4>
                  <p className="text-base lg:text-lg font-medium">{searchResults.customer_name}</p>
                  <div className="flex items-center space-x-2 text-xs lg:text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3 lg:h-4 lg:w-4" />
                    <span>Loan Date: {formatDate(searchResults.loan_date)}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-sm lg:text-base">Loan Status</h4>
                  {getStatusBadge(searchResults.status)}
                  <p className="text-lg lg:text-2xl font-bold text-[#C5A059]">
                    {formatCurrency(searchResults.principal_amount)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Interest Calculation */}
              {searchResults.interestInfo && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-sm lg:text-base">Interest Calculation</h4>
                  <div className="grid grid-cols-3 gap-2 lg:gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Principal</p>
                      <p className="font-semibold text-sm lg:text-base">{formatCurrency(searchResults.interestInfo.principal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Interest ({searchResults.interestInfo.interest_type})</p>
                      <p className="font-semibold text-orange-600 text-sm lg:text-base">{formatCurrency(searchResults.interestInfo.interest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="font-bold text-red-600 text-sm lg:text-lg">{formatCurrency(searchResults.interestInfo.total_amount)}</p>
                    </div>
                  </div>
                  <p className="text-center text-xs lg:text-sm text-muted-foreground">
                    {searchResults.interestInfo.days} days • {searchResults.interestInfo.interest_type} interest
                  </p>
                </div>
              )}

              <Separator />

              {/* Collateral Items */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm lg:text-base">Collateral Items ({searchResults.items.length})</h4>
                <div className="grid gap-2 lg:gap-3">
                  {searchResults.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 lg:p-3 border rounded-lg">
                      <div className="flex items-center space-x-2 lg:space-x-3">
                        <Weight className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-xs lg:text-sm">{item.qty}x {item.item_name}</p>
                          <div className="flex items-center space-x-1 lg:space-x-2 text-xs text-muted-foreground">
                            {getMetalBadge(item.metal)}
                            <span>{item.weight}gm • {item.percentage}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-xs lg:text-sm">{formatCurrency(item.value)}</p>
                        <p className="text-xs text-muted-foreground">Fine: {item.fine_weight}gm</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col space-y-2 lg:flex-row lg:justify-end lg:space-y-0 lg:space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowSearchDialog(false)} className="text-sm">
                  Close
                </Button>
                <Button 
                  onClick={() => navigateToLoanPage(searchResults)}
                  className="bg-[#C5A059] hover:bg-[#B08D45] text-white text-sm"
                >
                  View in {searchResults.status === 'active' ? 'Active' : searchResults.status === 'closed' ? 'Released' : 'Risk'} Loans
                </Button>
              </div>
            </div>
          )}
          
          {searchLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Searching...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="md:pl-64 lg:pl-72">
        <main className="py-4 px-4 lg:py-6 lg:px-8">
          <div className="animate-fade-in">
            {/* Pass search handler to children */}
            {React.cloneElement(children, { onGlobalSearch: handleGlobalSearch })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;