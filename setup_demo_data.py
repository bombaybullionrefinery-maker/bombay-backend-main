#!/usr/bin/env python3
"""
Demo data setup script for Gold Silver Loan Management System
"""
import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import json

# Load environment
ROOT_DIR = Path(__file__).parent / 'backend'
from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def setup_demo_data():
    print("🚀 Setting up demo data for Gold Silver Loan Management System...")
    
    # Create demo admin user
    print("👤 Creating demo admin user...")
    hashed_password = pwd_context.hash("password123")
    
    user_doc = {
        "id": "admin-user-001",
        "email": "admin@vault.com",
        "name": "Admin User",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "password": hashed_password
    }
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": "admin@vault.com"})
    if existing_user:
        print("✅ Admin user already exists")
    else:
        await db.users.insert_one(user_doc)
        print("✅ Admin user created - email: admin@vault.com, password: password123")
    
    # Create demo customers
    print("👥 Creating demo customers...")
    customers = [
        {
            "id": "customer-001",
            "name": "Rajesh Kumar",
            "phone": "+91-9876543210",
            "address": "123, MG Road, Bangalore, Karnataka - 560001",
            "id_proof": "AADHAR-123456789012",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "customer-002",
            "name": "Priya Sharma",
            "phone": "+91-9876543211",
            "address": "456, Brigade Road, Bangalore, Karnataka - 560025",
            "id_proof": "PAN-ABCDE1234F",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "customer-003",
            "name": "Anil Patel",
            "phone": "+91-9876543212",
            "address": "789, Commercial Street, Bangalore, Karnataka - 560001",
            "id_proof": "DL-KA0320230123456",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for customer in customers:
        existing = await db.customers.find_one({"id": customer["id"]})
        if not existing:
            await db.customers.insert_one(customer)
            print(f"✅ Created customer: {customer['name']}")
        else:
            print(f"✅ Customer already exists: {customer['name']}")
    
    # Create demo loans
    print("💰 Creating demo loans...")
    loans = [
        {
            "id": "loan-001",
            "serial_no": "A150",
            "customer_id": "customer-001",
            "customer_name": "Rajesh Kumar",
            "principal_amount": 50000.0,
            "loan_date": "2024-01-15T10:00:00.000Z",
            "status": "active",
            "items": [
                {
                    "id": "item-001",
                    "qty": 1,
                    "item_name": "Gold Chain",
                    "metal": "Gold",
                    "weight": 25.5,
                    "percentage": 22.0,
                    "fine_weight": 23.4,
                    "value": 55000.0
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "loan-002",
            "serial_no": "A151",
            "customer_id": "customer-002",
            "customer_name": "Priya Sharma",
            "principal_amount": 25000.0,
            "loan_date": "2024-02-01T14:30:00.000Z",
            "status": "active",
            "items": [
                {
                    "id": "item-002",
                    "qty": 2,
                    "item_name": "Silver Bangles",
                    "metal": "Silver",
                    "weight": 45.0,
                    "percentage": 92.5,
                    "fine_weight": 41.625,
                    "value": 30000.0
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "loan-003",
            "serial_no": "A152",
            "customer_id": "customer-003",
            "customer_name": "Anil Patel",
            "principal_amount": 75000.0,
            "loan_date": "2024-03-10T11:15:00.000Z",
            "status": "active",
            "items": [
                {
                    "id": "item-003-1",
                    "qty": 1,
                    "item_name": "Gold Ring",
                    "metal": "Gold",
                    "weight": 8.5,
                    "percentage": 18.0,
                    "fine_weight": 1.53,
                    "value": 15000.0
                },
                {
                    "id": "item-003-2",
                    "qty": 1,
                    "item_name": "Gold Necklace",
                    "metal": "Gold",
                    "weight": 35.2,
                    "percentage": 22.0,
                    "fine_weight": 32.2,
                    "value": 65000.0
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for loan in loans:
        existing = await db.loans.find_one({"id": loan["id"]})
        if not existing:
            await db.loans.insert_one(loan)
            print(f"✅ Created loan: {loan['serial_no']} for {loan['customer_name']}")
        else:
            print(f"✅ Loan already exists: {loan['serial_no']}")
    
    # Create demo payments
    print("💳 Creating demo payments...")
    payments = [
        {
            "id": "payment-001",
            "loan_id": "loan-001",
            "loan_serial_no": "A150",
            "customer_name": "Rajesh Kumar",
            "amount": 5000.0,
            "payment_date": "2024-02-15T10:00:00.000Z",
            "payment_type": "cash",
            "notes": "Partial payment",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "payment-002",
            "loan_id": "loan-002",
            "loan_serial_no": "A151",
            "customer_name": "Priya Sharma",
            "amount": 2500.0,
            "payment_date": "2024-03-01T15:30:00.000Z",
            "payment_type": "cash",
            "notes": "Monthly payment",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for payment in payments:
        existing = await db.payments.find_one({"id": payment["id"]})
        if not existing:
            await db.payments.insert_one(payment)
            print(f"✅ Created payment: ₹{payment['amount']} for {payment['customer_name']}")
        else:
            print(f"✅ Payment already exists for {payment['customer_name']}")
    
    print("\n🎉 Demo data setup completed!")
    print("\n📋 Demo Login Credentials:")
    print("Email: admin@vault.com")
    print("Password: password123")
    print("\n📊 Demo Data Created:")
    print("- 3 customers")
    print("- 3 active loans")
    print("- 2 payments")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(setup_demo_data())