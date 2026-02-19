# =========================
# Imports
# =========================
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
import jwt
from decimal import Decimal, ROUND_HALF_UP
import math

# =========================
# App Initialization
# =========================
app = FastAPI()

# =========================
# Environment Setup
# =========================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# =========================
# MongoDB Connection
# =========================
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URL or not DB_NAME:
    raise RuntimeError("MONGO_URL or DB_NAME not set in environment variables")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# =========================
# Security
# =========================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI(title="Gold Silver Loan Management System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    address: str
    id_proof: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: str
    id_proof: str

class Item(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    qty: int
    item_name: str
    metal: str  # Gold/Silver
    weight: float
    percentage: float
    fine_weight: float
    value: float

class ItemCreate(BaseModel):
    qty: int
    item_name: str
    metal: str
    weight: float
    percentage: float
    fine_weight: float
    value: float

class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    serial_no: str
    customer_id: str
    customer_name: str
    principal_amount: float
    monthly_interest: float = 2.0  # Default 2% monthly
    loan_date: datetime
    status: str = "active"  # active, closed, overdue
    items: List[Item] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class LoanCreate(BaseModel):
    customer_id: str
    customer_name: str
    principal_amount: float
    monthly_interest: float = 2.0
    loan_date: datetime
    items: List[ItemCreate]

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    loan_id: str
    loan_serial_no: str
    customer_name: str
    amount: float
    payment_date: datetime
    payment_type: str = "cash"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    loan_id: str
    amount: float
    payment_date: datetime
    notes: Optional[str] = None

class DashboardStats(BaseModel):
    total_active_loans: int
    total_loan_amount: float
    total_customers: int
    cash_in_hand: float
    recent_loans: List[Loan]
    recent_payments: List[Payment]

# Utility Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    return jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user_email = payload.get("sub")
    if user_email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user = await db.users.find_one({"email": user_email}, {"_id": 0})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return User(**user)

async def generate_serial_number() -> str:
    """Generate next serial number starting from A150"""
    last_loan = await db.loans.find_one({}, {"_id": 0, "serial_no": 1}, sort=[("created_at", -1)])
    if last_loan and last_loan.get("serial_no"):
        # Extract number from A150, A151, etc.
        try:
            last_num = int(last_loan["serial_no"][1:])
            next_num = last_num + 1
        except:
            next_num = 150
    else:
        next_num = 150
    return f"A{next_num}"

def calculate_interest(principal: float, start_date: datetime, current_date: datetime = None) -> dict:
    """Calculate interest: Simple for first year, compound after that"""
    if current_date is None:
        current_date = datetime.now(timezone.utc)
    
    # Calculate days
    total_days = (current_date - start_date).days
    
    # Annual interest rate (assumed 24% per annum)
    annual_rate = 0.24
    
    if total_days <= 365:
        # Simple interest for first year
        interest = principal * annual_rate * (total_days / 365)
        interest_type = "simple"
    else:
        # Compound interest after first year
        years = total_days / 365
        total_amount = principal * ((1 + annual_rate) ** years)
        interest = total_amount - principal
        interest_type = "compound"
    
    return {
        "principal": principal,
        "interest": round(interest, 2),
        "total_amount": round(principal + interest, 2),
        "days": total_days,
        "interest_type": interest_type
    }

@api_router.get("/")
async def root():
    return {"message": "Bombay Finance API", "status": "active", "version": "1.0"}
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["password"] = hashed_password
    user_obj = User(**{k: v for k, v in user_dict.items() if k != "password"})
    
    # Store in database
    doc = user_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["password"] = hashed_password
    
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not verify_password(user_data.password, user_doc["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user_data.email})
    
    # Convert datetime string back to datetime object if needed
    if isinstance(user_doc["created_at"], str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    user = User(**{k: v for k, v in user_doc.items() if k != "password" and k != "_id"})
    
    return Token(access_token=access_token, token_type="bearer", user=user)

# Customer Routes
@api_router.post("/customers", response_model=Customer)
async def create_customer(customer_data: CustomerCreate, current_user: User = Depends(get_current_user)):
    # Validate input data
    if not customer_data.name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required")
    if not customer_data.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is required")
    if not customer_data.address.strip():
        raise HTTPException(status_code=400, detail="Address is required")
    if not customer_data.id_proof.strip():
        raise HTTPException(status_code=400, detail="ID proof is required")
    
    customer_obj = Customer(**customer_data.model_dump())
    
    doc = customer_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.customers.insert_one(doc)
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: User = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    
    for customer in customers:
        if isinstance(customer["created_at"], str):
            customer["created_at"] = datetime.fromisoformat(customer["created_at"])
    
    return customers

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: User = Depends(get_current_user)):
    result = await db.customers.delete_one({"id": customer_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"message": "Customer deleted successfully"}

# Loan Routes
@api_router.post("/loans", response_model=Loan)
async def create_loan(loan_data: LoanCreate, current_user: User = Depends(get_current_user)):
    # Generate serial number
    serial_no = await generate_serial_number()
    
    # Convert ItemCreate to Item objects
    items = [Item(**item.model_dump()) for item in loan_data.items]
    
    loan_dict = loan_data.model_dump()
    loan_dict["serial_no"] = serial_no
    loan_dict["items"] = items
    loan_obj = Loan(**loan_dict)
    
    doc = loan_obj.model_dump()
    doc["loan_date"] = doc["loan_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.loans.insert_one(doc)
    return loan_obj

@api_router.get("/loans", response_model=List[Loan])
async def get_loans(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    
    loans = await db.loans.find(query, {"_id": 0}).to_list(1000)
    
    for loan in loans:
        if isinstance(loan["loan_date"], str):
            loan["loan_date"] = datetime.fromisoformat(loan["loan_date"])
        if isinstance(loan["created_at"], str):
            loan["created_at"] = datetime.fromisoformat(loan["created_at"])
    
    return loans

@api_router.get("/loans/{loan_id}", response_model=Loan)
async def get_loan(loan_id: str, current_user: User = Depends(get_current_user)):
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    if isinstance(loan["loan_date"], str):
        loan["loan_date"] = datetime.fromisoformat(loan["loan_date"])
    if isinstance(loan["created_at"], str):
        loan["created_at"] = datetime.fromisoformat(loan["created_at"])
    
    return loan

@api_router.get("/loans/{loan_id}/interest")
async def calculate_loan_interest(loan_id: str, current_user: User = Depends(get_current_user)):
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    loan_date = datetime.fromisoformat(loan["loan_date"]) if isinstance(loan["loan_date"], str) else loan["loan_date"]
    interest_info = calculate_interest(loan["principal_amount"], loan_date)
    
    return interest_info

@api_router.put("/loans/{loan_id}", response_model=Loan)
async def update_loan(loan_id: str, loan_data: dict, current_user: User = Depends(get_current_user)):
    # Update loan in database
    result = await db.loans.update_one(
        {"id": loan_id},
        {"$set": loan_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Fetch updated loan
    updated_loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    
    if isinstance(updated_loan["loan_date"], str):
        updated_loan["loan_date"] = datetime.fromisoformat(updated_loan["loan_date"])
    if isinstance(updated_loan["created_at"], str):
        updated_loan["created_at"] = datetime.fromisoformat(updated_loan["created_at"])
    
    return updated_loan

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, current_user: User = Depends(get_current_user)):
    result = await db.loans.delete_one({"id": loan_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    return {"message": "Loan deleted successfully"}

# Payment Routes
@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: User = Depends(get_current_user)):
    # Get loan details
    loan = await db.loans.find_one({"id": payment_data.loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    payment_dict = payment_data.model_dump()
    payment_dict["loan_serial_no"] = loan["serial_no"]
    payment_dict["customer_name"] = loan["customer_name"]
    payment_obj = Payment(**payment_dict)
    
    doc = payment_obj.model_dump()
    doc["payment_date"] = doc["payment_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.payments.insert_one(doc)
    return payment_obj

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(current_user: User = Depends(get_current_user)):
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    
    for payment in payments:
        if isinstance(payment["payment_date"], str):
            payment["payment_date"] = datetime.fromisoformat(payment["payment_date"])
        if isinstance(payment["created_at"], str):
            payment["created_at"] = datetime.fromisoformat(payment["created_at"])
    
    return payments

# Admin Routes\n@api_router.delete(\"/admin/clear-all-data\")\nasync def clear_all_data(current_user: User = Depends(get_current_user)):\n    \"\"\"Clear all data from the database - DANGER ZONE\"\"\"\n    try:\n        # Clear all collections\n        await db.customers.delete_many({})\n        await db.loans.delete_many({})\n        await db.payments.delete_many({})\n        \n        return {\"message\": \"All data cleared successfully\"}\n    except Exception as e:\n        raise HTTPException(\n            status_code=500,\n            detail=f\"Failed to clear data: {str(e)}\"\n        )\n\n# Dashboard Route
@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get active loans count and total amount
    active_loans = await db.loans.find({"status": "active"}, {"_id": 0}).to_list(1000)
    total_active_loans = len(active_loans)
    total_loan_amount = sum(loan["principal_amount"] for loan in active_loans)
    
    # Get customers count
    total_customers = await db.customers.count_documents({})
    
    # Calculate cash in hand (total payments received)
    payments = await db.payments.find({}, {"_id": 0, "amount": 1}).to_list(1000)
    cash_in_hand = sum(payment["amount"] for payment in payments)
    
    # Get recent loans (last 5)
    recent_loans_docs = await db.loans.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_loans = []
    for loan in recent_loans_docs:
        if isinstance(loan["loan_date"], str):
            loan["loan_date"] = datetime.fromisoformat(loan["loan_date"])
        if isinstance(loan["created_at"], str):
            loan["created_at"] = datetime.fromisoformat(loan["created_at"])
        recent_loans.append(loan)
    
    # Get recent payments (last 5)
    recent_payments_docs = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_payments = []
    for payment in recent_payments_docs:
        if isinstance(payment["payment_date"], str):
            payment["payment_date"] = datetime.fromisoformat(payment["payment_date"])
        if isinstance(payment["created_at"], str):
            payment["created_at"] = datetime.fromisoformat(payment["created_at"])
        recent_payments.append(payment)
    
    return DashboardStats(
        total_active_loans=total_active_loans,
        total_loan_amount=total_loan_amount,
        total_customers=total_customers,
        cash_in_hand=cash_in_hand,
        recent_loans=recent_loans,
        recent_payments=recent_payments
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
