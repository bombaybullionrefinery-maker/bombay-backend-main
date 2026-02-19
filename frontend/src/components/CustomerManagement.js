import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Phone, MapPin, CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const CustomerManagement = ({ onGlobalSearch }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSearch = searchParams.get('search') || '';

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    id_proof: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post('/customers', formData);
      toast.success('Customer created successfully!');
      setShowCreateDialog(false);
      setFormData({ name: '', phone: '', address: '', id_proof: '' });
      fetchCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error(error.response?.data?.detail || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.id_proof.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleGlobalSearch = async (e) => {
    e.preventDefault();
    if (globalSearchTerm.trim() && onGlobalSearch) {
      onGlobalSearch(globalSearchTerm);
    }
  };

  const deleteCustomer = async (customerId, customerName) => {
    if (window.confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`/customers/${customerId}`);
        toast.success(`Customer "${customerName}" deleted successfully`);
        fetchCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        toast.error('Failed to delete customer');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
            Customer Management
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Manage your customer database and information
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#C5A059] hover:bg-[#B08D45] text-white transition-button text-sm md:text-base"
              data-testid="create-customer-btn"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] mx-4">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Enter the customer details below to add them to your database.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCustomer} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter customer name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  data-testid="customer-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  data-testid="customer-phone-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter complete address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  required
                  rows={3}
                  data-testid="customer-address-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="id_proof">ID Proof *</Label>
                <Input
                  id="id_proof"
                  placeholder="Aadhar/PAN/Driving License No."
                  value={formData.id_proof}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_proof: e.target.value }))}
                  required
                  data-testid="customer-id-input"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="cancel-customer-btn"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                  disabled={isSubmitting}
                  data-testid="save-customer-btn"
                >
                  {isSubmitting ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Global and Local Search */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Global Search */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleGlobalSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Global search (loan/customer)..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                className="pl-10 text-sm md:text-base"
                data-testid="global-search-input"
              />
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Search for loans by serial number or customer name across the system
            </p>
          </CardContent>
        </Card>
        
        {/* Local Customer Search */}
        <Card className="rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm md:text-base"
                data-testid="customer-search-input"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
          <CardDescription>
            Complete list of registered customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No customers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No customers match your search criteria.' : 'Start by adding your first customer.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Address</TableHead>
                    <TableHead className="font-semibold">ID Proof</TableHead>
                    <TableHead className="font-semibold">Registered</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-muted/50" data-testid={`customer-row-${customer.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-[#C5A059]/10 text-[#C5A059] font-semibold">
                              {customer.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">Customer</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{customer.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start space-x-2 max-w-xs">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground line-clamp-2">
                            {customer.address}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {customer.id_proof}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(customer.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteCustomer(customer.id, customer.name)}
                          data-testid={`delete-customer-${customer.id}-btn`}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
};

export default CustomerManagement;