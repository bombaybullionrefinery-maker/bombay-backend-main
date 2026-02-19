import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const AddLoan = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [goldRate, setGoldRate] = useState(6500);
  const [silverRate, setSilverRate] = useState(8500); // Per kg
  const [nextSerialNumber, setNextSerialNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [loanForm, setLoanForm] = useState({
    customer_id: '',
    customer_name: '',
    principal_amount: '',
    loan_date: new Date().toISOString().split('T')[0],
    monthly_interest: 1.0,
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
      fetchCustomers(),
      loadRates(),
      fetchNextSerialNumber()
    ]);
  }, []);

  const fetchNextSerialNumber = async () => {
    try {
      // Get the last loan to determine next serial number
      const response = await axios.get('/loans');
      const allLoans = response.data;
      
      if (allLoans.length === 0) {
        setNextSerialNumber('A150');
      } else {
        // Sort by serial number to get the latest
        const sortedLoans = allLoans
          .filter(loan => loan.serial_no.startsWith('A'))
          .sort((a, b) => {
            const numA = parseInt(a.serial_no.substring(1));
            const numB = parseInt(b.serial_no.substring(1));
            return numB - numA;
          });
        
        if (sortedLoans.length > 0) {
          const lastNumber = parseInt(sortedLoans[0].serial_no.substring(1));
          setNextSerialNumber(`A${lastNumber + 1}`);
        } else {
          setNextSerialNumber('A150');
        }
      }
    } catch (error) {
      console.error('Error fetching serial number:', error);
      setNextSerialNumber('A150');
    }
  };

  const loadRates = () => {
    const savedGoldRate = localStorage.getItem('goldRate');
    const savedSilverRate = localStorage.getItem('silverRate');
    if (savedGoldRate) setGoldRate(parseFloat(savedGoldRate));
    if (savedSilverRate) setSilverRate(parseFloat(savedSilverRate));
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
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
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate fine weight when weight or percentage changes
          if (field === 'weight' || field === 'percentage') {
            const weight = parseFloat(field === 'weight' ? value : item.weight) || 0;
            const percentage = parseFloat(field === 'percentage' ? value : item.percentage) || 0;
            updatedItem.fine_weight = ((weight * percentage) / 100).toFixed(3);
            
            // Auto-calculate value based on metal type and rate
            const fineWeight = parseFloat(updatedItem.fine_weight) || 0;
            const rate = updatedItem.metal === 'Gold' ? goldRate : (silverRate / 1000); // Convert kg rate to gram
            updatedItem.value = (fineWeight * rate).toFixed(2);
          }
          
          // If metal type changes, recalculate value
          if (field === 'metal') {
            const fineWeight = parseFloat(updatedItem.fine_weight) || 0;
            const rate = value === 'Gold' ? goldRate : (silverRate / 1000);
            updatedItem.value = (fineWeight * rate).toFixed(2);
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const loanAmount = parseFloat(loanForm.principal_amount);
      
      // Validate cash in hand
      const cashInHand = parseFloat(localStorage.getItem('cashInHand') || '0');
      if (loanAmount > cashInHand) {
        toast.error(`Insufficient cash in hand. Available: ₹${cashInHand.toLocaleString()}, Required: ₹${loanAmount.toLocaleString()}`);
        setIsSubmitting(false);
        return;
      }

      const loanData = {
        ...loanForm,
        principal_amount: loanAmount,
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

      const response = await axios.post('/loans', loanData);
      
      // Update cash in hand
      const newCashInHand = cashInHand - loanAmount;
      localStorage.setItem('cashInHand', newCashInHand.toString());
      
      toast.success('Loan created successfully!');
      
      // Auto-print POS58 receipt
      printLoanReceipt(response.data);
      
      // Navigate to active loans
      navigate('/loans/active');
    } catch (error) {
      console.error('Error creating loan:', error);
      toast.error(error.response?.data?.detail || 'Failed to create loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const printLoanReceipt = (loan) => {
    // Create modern POS58 format receipt (58mm thermal printer)
    const receipt = `
═══════════════════════════════
       BOMBAY FINANCE
   Gold & Silver Loans
     Professional Service
═══════════════════════════════

LOAN RECEIPT
─────────────────────────────── 
Serial No    : ${loan.serial_no}
Date         : ${new Date(loan.loan_date).toLocaleDateString('en-IN')}
Customer     : ${loan.customer_name}
Principal    : ₹${loan.principal_amount.toLocaleString()}
Interest     : ${loanForm.monthly_interest}% per month
───────────────────────────────
COLLATERAL DETAILS:

${loan.items.map((item, i) => 
  `Item ${i + 1}: ${item.item_name}
   Metal    : ${item.metal}
   Quantity : ${item.qty} pcs
   Weight   : ${item.weight}gm
   Purity   : ${item.percentage}%
   Fine Wt  : ${item.fine_weight}gm
   Value    : ₹${item.value.toLocaleString()}
`).join('\n')}───────────────────────────────
Total Collateral Value:
₹${loan.items.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
───────────────────────────────

TERMS & CONDITIONS:
• Interest: ${loanForm.monthly_interest}% per month
• Year 1: Simple Interest
• Year 2+: Compound Interest
• Repayment: Cash payments accepted

═══════════════════════════════
      Thank you for choosing
         BOMBAY FINANCE
    Contact: +91-XXXXX-XXXXX
═══════════════════════════════

Print Time: ${new Date().toLocaleString()}
    `;
    
    // Create a proper POS thermal print window
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loan Receipt - ${loan.serial_no}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 5mm;
            }
            
            @media print {
              body { 
                margin: 0; 
                padding: 0;
                width: 48mm; /* 58mm - margins */
              }
              .no-print { display: none !important; }
            }
            
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 9px; 
              line-height: 1.2;
              margin: 0;
              padding: 8px;
              width: 48mm;
              background: white;
              color: black;
            }
            
            .receipt {
              width: 100%;
              margin: 0 auto;
            }
            
            pre { 
              white-space: pre-wrap; 
              margin: 0;
              font-family: 'Courier New', monospace;
              font-size: 9px;
              line-height: 1.2;
            }
            
            .print-button {
              position: fixed;
              top: 10px;
              right: 10px;
              padding: 8px 16px;
              background: #C5A059;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
              z-index: 1000;
            }
            
            .print-button:hover {
              background: #B08D45;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print(); window.close();">
            Print Receipt
          </button>
          <div class="receipt">
            <pre>${receipt}</pre>
          </div>
          <script>
            // Auto-print after 1 second
            setTimeout(() => {
              window.print();
            }, 1000);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const interestOptions = [
    { value: 1.0, label: '1.0%' },
    { value: 1.5, label: '1.5%' },
    { value: 2.0, label: '2.0%' },
    { value: 2.5, label: '2.5%' },
    { value: 3.0, label: '3.0%' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/loans/active')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Loans</span>
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Add New Loan
          </h1>
          <p className="text-muted-foreground mt-2">
            Create a new gold or silver loan with collateral details
          </p>
        </div>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
          <CardDescription>
            Fill in the loan information below. Serial number will be auto-generated.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleCreateLoan} className="space-y-6">
            {/* Basic Loan Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-sm font-semibold">Customer Name *</Label>
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
                <Label htmlFor="principal_amount" className="text-sm font-semibold">Principal Amount (₹) *</Label>
                <Input
                  id="principal_amount"
                  type="number"
                  placeholder="Enter loan amount"
                  value={loanForm.principal_amount}
                  onChange={(e) => setLoanForm(prev => ({ ...prev, principal_amount: e.target.value }))}
                  required
                  className="text-lg font-medium"
                  data-testid="loan-amount-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loan_date" className="text-sm font-semibold">Date *</Label>
                <Input
                  id="loan_date"
                  type="date"
                  value={loanForm.loan_date}
                  onChange={(e) => setLoanForm(prev => ({ ...prev, loan_date: e.target.value }))}
                  required
                  data-testid="loan-date-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="monthly_interest" className="text-sm font-semibold">Monthly Interest Rate *</Label>
                <Select 
                  value={loanForm.monthly_interest.toString()} 
                  onValueChange={(value) => setLoanForm(prev => ({ ...prev, monthly_interest: parseFloat(value) }))}
                >
                  <SelectTrigger data-testid="monthly-interest-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interestOptions.map(option => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label} per month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Serial Number</Label>
                <div className="p-3 bg-muted/50 rounded-md border-2 border-[#C5A059]/20">
                  <Badge variant="outline" className="font-mono text-lg font-bold text-[#C5A059] bg-[#C5A059]/10">
                    {nextSerialNumber || 'Loading...'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Next available serial number</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Collateral Items</h3>
                  <p className="text-sm text-muted-foreground">
                    Current rates: Gold ₹{goldRate}/gm, Silver ₹{silverRate}/kg
                  </p>
                </div>
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
                <Card key={index} className="p-4 border-2">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-lg">Item #{index + 1}</h4>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Quantity *</Label>
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
                      <Label className="text-sm font-medium">Item Name *</Label>
                      <Input
                        placeholder="e.g., Gold Chain, Silver Ring"
                        value={item.item_name}
                        onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                        required
                        data-testid={`item-${index}-name-input`}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Metal Type *</Label>
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
                      <Label className="text-sm font-medium">Weight (gm) *</Label>
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
                      <Label className="text-sm font-medium">Purity (%) *</Label>
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
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fine Weight (gm)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Auto-calculated"
                        value={item.fine_weight}
                        readOnly
                        className="bg-muted/30 font-mono"
                        data-testid={`item-${index}-fine-weight-input`}
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                      <Label className="text-sm font-medium">Item Value (₹) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Auto-calculated based on rate"
                        value={item.value}
                        onChange={(e) => updateItem(index, 'value', e.target.value)}
                        required
                        className="text-lg font-semibold text-green-700"
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
                onClick={() => navigate('/loans/active')}
                data-testid="cancel-loan-btn"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#C5A059] hover:bg-[#B08D45] text-white px-8"
                disabled={isSubmitting}
                data-testid="save-loan-btn"
              >
                {isSubmitting ? 'Creating Loan...' : 'Create Loan & Print'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddLoan;