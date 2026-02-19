class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    serial_no: str
    customer_id: str
    customer_name: str
    principal_amount: float
    monthly_interest: float = 2.0  # Default 2% monthly
    loan_date: datetime
    last_interest_payment_date: Optional[datetime] = None  # Track when interest was last paid
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
    transaction_type: str = "interest"  # interest, principal, both, full_release
    principal_paid: float = 0.0  # Amount paid towards principal
    interest_paid: float = 0.0   # Amount paid towards interest
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentCreate(BaseModel):
    loan_id: str
    amount: float
    payment_date: datetime
    transaction_type: str = "interest"
    principal_paid: float = 0.0
    interest_paid: float = 0.0
    notes: Optional[str] = None