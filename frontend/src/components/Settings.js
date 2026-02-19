import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  DollarSign, 
  Database,
  Download,
  Upload,
  Key,
  Save,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const [goldRate, setGoldRate] = useState(6500);
  const [silverRate, setSilverRate] = useState(85000); // Per kg
  const [cashInHand, setCashInHand] = useState(0);
  const [firebaseConfig, setFirebaseConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [companyInfo, setCompanyInfo] = useState({
    name: 'Bombay Finance',
    address: '',
    phone: '',
    email: '',
    license: ''
  });

  const loadSettings = () => {
    // Load from localStorage
    const savedGoldRate = localStorage.getItem('goldRate');
    const savedSilverRate = localStorage.getItem('silverRate');
    const savedCashInHand = localStorage.getItem('cashInHand');
    const savedFirebaseConfig = localStorage.getItem('firebaseConfig');
    const savedCompanyInfo = localStorage.getItem('companyInfo');

    if (savedGoldRate) setGoldRate(parseFloat(savedGoldRate));
    if (savedSilverRate) setSilverRate(parseFloat(savedSilverRate));
    if (savedCashInHand) setCashInHand(parseFloat(savedCashInHand));
    if (savedFirebaseConfig) {
      try {
        setFirebaseConfig(JSON.parse(savedFirebaseConfig));
      } catch (e) {
        console.error('Error parsing Firebase config:', e);
      }
    }
    if (savedCompanyInfo) {
      try {
        setCompanyInfo(JSON.parse(savedCompanyInfo));
      } catch (e) {
        console.error('Error parsing company info:', e);
      }
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const saveRates = () => {
    localStorage.setItem('goldRate', goldRate.toString());
    localStorage.setItem('silverRate', silverRate.toString());
    toast.success('Metal rates updated successfully!');
  };

  const saveCashInHand = () => {
    localStorage.setItem('cashInHand', cashInHand.toString());
    toast.success('Cash in hand updated successfully!');
    
    // Trigger a custom event to update other components
    window.dispatchEvent(new CustomEvent('cashInHandUpdated', { 
      detail: { newAmount: cashInHand }
    }));
  };

  const saveFirebaseConfig = () => {
    localStorage.setItem('firebaseConfig', JSON.stringify(firebaseConfig));
    toast.success('Firebase configuration saved successfully!');
  };

  const saveCompanyInfo = () => {
    localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
    toast.success('Company information updated successfully!');
  };

  const exportBackup = () => {
    const backupData = {
      goldRate,
      silverRate,
      cashInHand,
      firebaseConfig,
      companyInfo,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bombay-finance-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Backup exported successfully!');
  };

  const importBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        
        if (backupData.goldRate) setGoldRate(backupData.goldRate);
        if (backupData.silverRate) setSilverRate(backupData.silverRate);
        if (backupData.cashInHand) setCashInHand(backupData.cashInHand);
        if (backupData.firebaseConfig) setFirebaseConfig(backupData.firebaseConfig);
        if (backupData.companyInfo) setCompanyInfo(backupData.companyInfo);
        
        // Save to localStorage
        localStorage.setItem('goldRate', (backupData.goldRate || goldRate).toString());
        localStorage.setItem('silverRate', (backupData.silverRate || silverRate).toString());
        localStorage.setItem('cashInHand', (backupData.cashInHand || cashInHand).toString());
        localStorage.setItem('firebaseConfig', JSON.stringify(backupData.firebaseConfig || firebaseConfig));
        localStorage.setItem('companyInfo', JSON.stringify(backupData.companyInfo || companyInfo));
        
        toast.success('Backup imported successfully!');
        
        // Trigger cash update event
        window.dispatchEvent(new CustomEvent('cashInHandUpdated', { 
          detail: { newAmount: backupData.cashInHand || cashInHand }
        }));
      } catch (error) {
        toast.error('Invalid backup file format');
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = async () => {
    const confirmMessage = 'This action permanently deletes all loans, customers, payments, history, and settings. This cannot be undone. Type \"DELETE ALL\" to confirm:';
    const userInput = prompt(confirmMessage);
    
    if (userInput !== 'DELETE ALL') {
      toast.error('Data deletion cancelled');
      return;
    }

    try {
      // Clear all collections
      await axios.delete('/admin/clear-all-data');
      
      // Clear local storage
      localStorage.clear();
      
      // Reset local state
      setGoldRate(6500);
      setSilverRate(85000);
      setCashInHand(0);
      setFirebaseConfig({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      });
      
      toast.success('All data cleared successfully');
      
      // Trigger cash update event
      window.dispatchEvent(new CustomEvent('cashInHandUpdated', { 
        detail: { newAmount: 0 }
      }));
      
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear all data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure system settings and manage your data
          </p>
        </div>
      </div>

      <Tabs defaultValue="rates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rates" data-testid="rates-tab">Metal Rates</TabsTrigger>
          <TabsTrigger value="cash" data-testid="cash-tab">Cash Management</TabsTrigger>
          <TabsTrigger value="firebase" data-testid="firebase-tab">Firebase Config</TabsTrigger>
          <TabsTrigger value="backup" data-testid="backup-tab">Backup & Data</TabsTrigger>
        </TabsList>

        {/* Metal Rates Tab */}
        <TabsContent value="rates">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Metal Rates Management</span>
              </CardTitle>
              <CardDescription>
                Set current gold and silver rates for automatic valuation calculations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="gold_rate">Gold Rate (₹/gram)</Label>
                  <Input
                    id="gold_rate"
                    type="number"
                    step="0.01"
                    value={goldRate}
                    onChange={(e) => setGoldRate(parseFloat(e.target.value) || 0)}
                    data-testid="gold-rate-input"
                  />
                  <p className="text-sm text-muted-foreground">
                    Current rate: ₹{goldRate}/gram
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="silver_rate">Silver Rate (₹/kg)</Label>
                  <Input
                    id="silver_rate"
                    type="number"
                    step="0.01"
                    value={silverRate}
                    onChange={(e) => setSilverRate(parseFloat(e.target.value) || 0)}
                    data-testid="silver-rate-input"
                  />
                  <p className="text-sm text-muted-foreground">
                    Current rate: ₹{silverRate}/kg (₹{(silverRate/1000).toFixed(2)}/gm)
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Rate Conversion Info</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700">
                      <strong>Gold:</strong> ₹{goldRate} per gram
                    </p>
                  </div>
                  <div>
                    <p className="text-blue-700">
                      <strong>Silver:</strong> ₹{silverRate} per kg = ₹{(silverRate/1000).toFixed(2)} per gram
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={saveRates}
                  className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                  data-testid="save-rates-btn"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Rates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Management Tab */}
        <TabsContent value="cash">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Cash Management</span>
              </CardTitle>
              <CardDescription>
                Track and manage cash in hand for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cash_in_hand">Cash in Hand (₹)</Label>
                <Input
                  id="cash_in_hand"
                  type="number"
                  step="0.01"
                  value={cashInHand}
                  onChange={(e) => setCashInHand(parseFloat(e.target.value) || 0)}
                  data-testid="cash-in-hand-input"
                />
                <p className="text-sm text-muted-foreground">
                  Current cash in hand: ₹{cashInHand.toLocaleString()}
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={saveCashInHand}
                  className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                  data-testid="save-cash-btn"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Update Cash
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Firebase Configuration Tab */}
        <TabsContent value="firebase">
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Firebase Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure Firebase settings for future cloud deployment (Copy & Paste)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    placeholder="Your Firebase API key"
                    value={firebaseConfig.apiKey}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    data-testid="firebase-api-key-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="auth_domain">Auth Domain</Label>
                  <Input
                    id="auth_domain"
                    placeholder="your-project.firebaseapp.com"
                    value={firebaseConfig.authDomain}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, authDomain: e.target.value }))}
                    data-testid="firebase-auth-domain-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project_id">Project ID</Label>
                  <Input
                    id="project_id"
                    placeholder="your-project-id"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, projectId: e.target.value }))}
                    data-testid="firebase-project-id-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="storage_bucket">Storage Bucket</Label>
                  <Input
                    id="storage_bucket"
                    placeholder="your-project.appspot.com"
                    value={firebaseConfig.storageBucket}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, storageBucket: e.target.value }))}
                    data-testid="firebase-storage-bucket-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="messaging_sender_id">Messaging Sender ID</Label>
                  <Input
                    id="messaging_sender_id"
                    placeholder="123456789"
                    value={firebaseConfig.messagingSenderId}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, messagingSenderId: e.target.value }))}
                    data-testid="firebase-messaging-sender-id-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="app_id">App ID</Label>
                  <Input
                    id="app_id"
                    placeholder="1:123456789:web:abcdef"
                    value={firebaseConfig.appId}
                    onChange={(e) => setFirebaseConfig(prev => ({ ...prev, appId: e.target.value }))}
                    data-testid="firebase-app-id-input"
                  />
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Firebase Migration Guide</h4>
                <p className="text-sm text-green-700">
                  Simply paste your Firebase configuration values above and click save. 
                  The system is designed to work seamlessly with Firebase Firestore and Authentication.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={saveFirebaseConfig}
                  className="bg-[#C5A059] hover:bg-[#B08D45] text-white"
                  data-testid="save-firebase-btn"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup & Data Tab */}
        <TabsContent value="backup">
          <div className="space-y-6">
            {/* Export Backup */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Export Backup</span>
                </CardTitle>
                <CardDescription>
                  Download a backup of your settings and configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={exportBackup}
                  variant="outline"
                  className="w-full md:w-auto"
                  data-testid="export-backup-btn"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Backup
                </Button>
              </CardContent>
            </Card>

            {/* Import Backup */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Import Backup</span>
                </CardTitle>
                <CardDescription>
                  Restore settings and configuration from a backup file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={importBackup}
                    data-testid="import-backup-input"
                  />
                  <p className="text-sm text-muted-foreground">
                    Select a JSON backup file to restore your settings
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Clear All Data */}
            <Card className="rounded-xl shadow-sm border-destructive/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  This action permanently deletes all loans, history, and settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={clearAllData}
                  variant="destructive"
                  className="w-full md:w-auto"
                  data-testid="clear-all-data-btn"
                >
                  Clear All Data
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This action cannot be undone. Please backup your data first.
                </p>
              </CardContent>
            </Card>

            {/* Database Info */}
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Database Information</span>
                </CardTitle>
                <CardDescription>
                  Current database and storage information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Database Type</Label>
                      <p className="text-sm text-muted-foreground">MongoDB (Local)</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Storage</Label>
                      <p className="text-sm text-muted-foreground">Local File System</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> When migrating to Firebase, ensure all your data is backed up. 
                      The system is designed to work seamlessly with Firebase Firestore and Authentication.
                      Simply configure your Firebase keys above and deploy.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;