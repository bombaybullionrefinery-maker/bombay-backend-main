#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class GoldSilverLoanAPITester:
    def __init__(self, base_url: str = "https://pawn-finance-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.headers = {'Content-Type': 'application/json'}
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_customer_id = None
        self.created_loan_id = None
        self.created_payment_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED")
        else:
            print(f"❌ {name}: FAILED - {details}")
        
        self.test_results.append({
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Any]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.api_url}/{endpoint}"
        headers = self.headers.copy()
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
            
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}"

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with demo credentials
        login_data = {
            "email": "admin@vault.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("Login with demo credentials", True, "Successfully authenticated")
            
            # Verify user data in response
            if 'user' in response and response['user'].get('email') == 'admin@vault.com':
                self.log_test("Login response contains user data", True)
            else:
                self.log_test("Login response contains user data", False, "User data missing or incorrect")
        else:
            self.log_test("Login with demo credentials", False, f"Login failed: {response}")
            return False
        
        # Test invalid login
        invalid_login = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        
        success, response = self.make_request('POST', 'auth/login', invalid_login, expected_status=401)
        self.log_test("Invalid login rejection", success, "Should reject invalid credentials")
        
        return True

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        print("\n📊 Testing Dashboard Stats...")
        
        success, response = self.make_request('GET', 'dashboard')
        
        if success:
            required_fields = ['total_active_loans', 'total_loan_amount', 'total_customers', 'cash_in_hand', 'recent_loans', 'recent_payments']
            missing_fields = [field for field in required_fields if field not in response]
            
            if not missing_fields:
                self.log_test("Dashboard stats structure", True, "All required fields present")
                
                # Validate data types
                if (isinstance(response['total_active_loans'], int) and 
                    isinstance(response['total_loan_amount'], (int, float)) and
                    isinstance(response['total_customers'], int) and
                    isinstance(response['cash_in_hand'], (int, float)) and
                    isinstance(response['recent_loans'], list) and
                    isinstance(response['recent_payments'], list)):
                    self.log_test("Dashboard stats data types", True, "All fields have correct data types")
                else:
                    self.log_test("Dashboard stats data types", False, "Some fields have incorrect data types")
            else:
                self.log_test("Dashboard stats structure", False, f"Missing fields: {missing_fields}")
        else:
            self.log_test("Dashboard stats endpoint", False, f"Failed to fetch dashboard stats: {response}")

    def test_customer_management(self):
        """Test customer management endpoints"""
        print("\n👥 Testing Customer Management...")
        
        # Test get customers (should work even if empty)
        success, response = self.make_request('GET', 'customers')
        if success and isinstance(response, list):
            self.log_test("Get customers list", True, f"Retrieved {len(response)} customers")
        else:
            self.log_test("Get customers list", False, f"Failed to get customers: {response}")
        
        # Test create customer
        customer_data = {
            "name": "Test Customer",
            "phone": "9876543210",
            "address": "123 Test Street, Test City, Test State - 123456",
            "id_proof": "AADHAR123456789"
        }
        
        success, response = self.make_request('POST', 'customers', customer_data)
        if success and 'id' in response:
            self.created_customer_id = response['id']
            self.log_test("Create customer", True, f"Customer created with ID: {self.created_customer_id}")
            
            # Verify customer data
            if (response['name'] == customer_data['name'] and 
                response['phone'] == customer_data['phone']):
                self.log_test("Customer data integrity", True, "Created customer data matches input")
            else:
                self.log_test("Customer data integrity", False, "Customer data doesn't match input")
        else:
            self.log_test("Create customer", False, f"Failed to create customer: {response}")
        
        # Test get customers again to verify the new customer appears
        success, response = self.make_request('GET', 'customers')
        if success and isinstance(response, list):
            customer_found = any(c.get('id') == self.created_customer_id for c in response)
            self.log_test("Customer appears in list", customer_found, "New customer should appear in customers list")
        else:
            self.log_test("Customer appears in list", False, "Failed to verify customer in list")

    def test_loan_management(self):
        """Test loan management endpoints"""
        print("\n💰 Testing Loan Management...")
        
        if not self.created_customer_id:
            self.log_test("Loan management prerequisites", False, "No customer available for loan creation")
            return
        
        # Test get loans (should work even if empty)
        success, response = self.make_request('GET', 'loans')
        if success and isinstance(response, list):
            self.log_test("Get loans list", True, f"Retrieved {len(response)} loans")
        else:
            self.log_test("Get loans list", False, f"Failed to get loans: {response}")
        
        # Test create loan with multiple items
        loan_data = {
            "customer_id": self.created_customer_id,
            "customer_name": "Test Customer",
            "principal_amount": 50000.0,
            "loan_date": datetime.now(timezone.utc).isoformat(),
            "items": [
                {
                    "qty": 1,
                    "item_name": "Gold Chain",
                    "metal": "Gold",
                    "weight": 10.5,
                    "percentage": 95.0,
                    "fine_weight": 9.975,
                    "value": 55000.0
                },
                {
                    "qty": 2,
                    "item_name": "Silver Rings",
                    "metal": "Silver",
                    "weight": 15.0,
                    "percentage": 92.5,
                    "fine_weight": 13.875,
                    "value": 8000.0
                }
            ]
        }
        
        success, response = self.make_request('POST', 'loans', loan_data)
        if success and 'id' in response:
            self.created_loan_id = response['id']
            self.log_test("Create loan with multiple items", True, f"Loan created with ID: {self.created_loan_id}")
            
            # Verify serial number generation (should start with A150)
            if 'serial_no' in response and response['serial_no'].startswith('A'):
                self.log_test("Serial number generation", True, f"Serial number: {response['serial_no']}")
            else:
                self.log_test("Serial number generation", False, "Serial number not generated correctly")
            
            # Verify loan data
            if (response['principal_amount'] == loan_data['principal_amount'] and 
                len(response['items']) == len(loan_data['items'])):
                self.log_test("Loan data integrity", True, "Created loan data matches input")
            else:
                self.log_test("Loan data integrity", False, "Loan data doesn't match input")
        else:
            self.log_test("Create loan with multiple items", False, f"Failed to create loan: {response}")
        
        # Test get specific loan
        if self.created_loan_id:
            success, response = self.make_request('GET', f'loans/{self.created_loan_id}')
            if success and response.get('id') == self.created_loan_id:
                self.log_test("Get specific loan", True, "Successfully retrieved loan by ID")
            else:
                self.log_test("Get specific loan", False, f"Failed to get loan by ID: {response}")
        
        # Test interest calculation
        if self.created_loan_id:
            success, response = self.make_request('GET', f'loans/{self.created_loan_id}/interest')
            if success and 'principal' in response and 'interest' in response:
                self.log_test("Interest calculation", True, f"Interest calculated: {response}")
                
                # Verify interest calculation fields
                required_fields = ['principal', 'interest', 'total_amount', 'days', 'interest_type']
                if all(field in response for field in required_fields):
                    self.log_test("Interest calculation structure", True, "All required fields present")
                else:
                    self.log_test("Interest calculation structure", False, "Missing required fields")
            else:
                self.log_test("Interest calculation", False, f"Failed to calculate interest: {response}")

    def test_payment_management(self):
        """Test payment management endpoints"""
        print("\n💳 Testing Payment Management...")
        
        if not self.created_loan_id:
            self.log_test("Payment management prerequisites", False, "No loan available for payment creation")
            return
        
        # Test get payments (should work even if empty)
        success, response = self.make_request('GET', 'payments')
        if success and isinstance(response, list):
            self.log_test("Get payments list", True, f"Retrieved {len(response)} payments")
        else:
            self.log_test("Get payments list", False, f"Failed to get payments: {response}")
        
        # Test create payment
        payment_data = {
            "loan_id": self.created_loan_id,
            "amount": 5000.0,
            "payment_date": datetime.now(timezone.utc).isoformat(),
            "notes": "Test payment for loan"
        }
        
        success, response = self.make_request('POST', 'payments', payment_data)
        if success and 'id' in response:
            self.created_payment_id = response['id']
            self.log_test("Create payment", True, f"Payment created with ID: {self.created_payment_id}")
            
            # Verify payment data
            if (response['amount'] == payment_data['amount'] and 
                'loan_serial_no' in response and 
                'customer_name' in response):
                self.log_test("Payment data integrity", True, "Created payment data is complete")
            else:
                self.log_test("Payment data integrity", False, "Payment data incomplete or incorrect")
        else:
            self.log_test("Create payment", False, f"Failed to create payment: {response}")

    def test_data_persistence(self):
        """Test that created data persists across requests"""
        print("\n🔄 Testing Data Persistence...")
        
        # Re-fetch dashboard to see if our created data is reflected
        success, response = self.make_request('GET', 'dashboard')
        if success:
            if response['total_customers'] > 0:
                self.log_test("Customer count updated", True, f"Total customers: {response['total_customers']}")
            else:
                self.log_test("Customer count updated", False, "Customer count not updated")
            
            if response['total_active_loans'] > 0:
                self.log_test("Loan count updated", True, f"Total active loans: {response['total_active_loans']}")
            else:
                self.log_test("Loan count updated", False, "Loan count not updated")
            
            if response['cash_in_hand'] > 0:
                self.log_test("Cash in hand updated", True, f"Cash in hand: {response['cash_in_hand']}")
            else:
                self.log_test("Cash in hand updated", False, "Cash in hand not updated")

    def test_error_handling(self):
        """Test API error handling"""
        print("\n⚠️ Testing Error Handling...")
        
        # Test unauthorized access (without token)
        old_token = self.token
        self.token = None
        
        success, response = self.make_request('GET', 'customers', expected_status=401)
        if not success:
            # Try 403 as well, as some APIs return 403 for unauthorized access
            success, response = self.make_request('GET', 'customers', expected_status=403)
        self.log_test("Unauthorized access rejection", success, "Should reject requests without token")
        
        # Restore token
        self.token = old_token
        
        # Test invalid loan ID
        success, response = self.make_request('GET', 'loans/invalid-id', expected_status=404)
        self.log_test("Invalid loan ID handling", success, "Should return 404 for invalid loan ID")
        
        # Test invalid customer data
        invalid_customer = {
            "name": "",  # Empty name should fail
            "phone": "invalid",
            "address": "",
            "id_proof": ""
        }
        
        success, response = self.make_request('POST', 'customers', invalid_customer, expected_status=422)
        if not success and self.make_request('POST', 'customers', invalid_customer, expected_status=400)[0]:
            success = True  # Accept either 422 or 400 for validation errors
        
        self.log_test("Invalid customer data rejection", success, "Should reject invalid customer data")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Gold Silver Loan Management System API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run test suites in order
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return False
        
        self.test_dashboard_stats()
        self.test_customer_management()
        self.test_loan_management()
        self.test_payment_management()
        self.test_data_persistence()
        self.test_error_handling()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return False

    def get_test_report(self):
        """Get detailed test report"""
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results,
            "created_data": {
                "customer_id": self.created_customer_id,
                "loan_id": self.created_loan_id,
                "payment_id": self.created_payment_id
            }
        }

def main():
    """Main test execution"""
    tester = GoldSilverLoanAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed report
        report = tester.get_test_report()
        with open('/app/backend_test_report.json', 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: /app/backend_test_report.json")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"💥 Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())