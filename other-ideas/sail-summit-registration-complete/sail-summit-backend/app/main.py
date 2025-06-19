from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
from datetime import datetime
import json

app = FastAPI(title="SAIL Summit Registration API", version="1.0.0")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

registrations_db = []
payment_intents_db = []

class RegistrationRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    phone: Optional[str] = None
    organization: str
    jobTitle: str
    industry: str
    attendanceType: str
    dietaryRestrictions: Optional[str] = None
    accessibility: Optional[str] = None
    marketingConsent: bool = False
    termsAccepted: bool

class PaymentIntentRequest(BaseModel):
    amount: int = 2000  # $20.00 in cents
    currency: str = "usd"
    registration_data: RegistrationRequest

class Registration(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    phone: Optional[str]
    organization: str
    jobTitle: str
    industry: str
    attendanceType: str
    dietaryRestrictions: Optional[str]
    accessibility: Optional[str]
    marketingConsent: bool
    termsAccepted: bool
    registrationDate: datetime
    paymentStatus: str = "pending"
    paymentIntentId: Optional[str] = None

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/create-payment-intent")
async def create_payment_intent(request: PaymentIntentRequest):
    """Create a payment intent for the registration fee"""
    try:
        payment_intent_id = f"pi_{uuid.uuid4().hex[:24]}"
        client_secret = f"{payment_intent_id}_secret_{uuid.uuid4().hex[:16]}"
        
        payment_intent = {
            "id": payment_intent_id,
            "client_secret": client_secret,
            "amount": request.amount,
            "currency": request.currency,
            "status": "requires_payment_method",
            "registration_data": request.registration_data.dict(),
            "created_at": datetime.now()
        }
        payment_intents_db.append(payment_intent)
        
        return {
            "client_secret": client_secret,
            "payment_intent_id": payment_intent_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create payment intent: {str(e)}")

@app.post("/api/confirm-registration")
async def confirm_registration(payment_intent_id: str):
    """Confirm registration after successful payment"""
    try:
        payment_intent = None
        for pi in payment_intents_db:
            if pi["id"] == payment_intent_id:
                payment_intent = pi
                break
        
        if not payment_intent:
            raise HTTPException(status_code=404, detail="Payment intent not found")
        
        registration_id = str(uuid.uuid4())
        registration_data = payment_intent["registration_data"]
        
        registration = Registration(
            id=registration_id,
            firstName=registration_data["firstName"],
            lastName=registration_data["lastName"],
            email=registration_data["email"],
            phone=registration_data.get("phone"),
            organization=registration_data["organization"],
            jobTitle=registration_data["jobTitle"],
            industry=registration_data["industry"],
            attendanceType=registration_data["attendanceType"],
            dietaryRestrictions=registration_data.get("dietaryRestrictions"),
            accessibility=registration_data.get("accessibility"),
            marketingConsent=registration_data["marketingConsent"],
            termsAccepted=registration_data["termsAccepted"],
            registrationDate=datetime.now(),
            paymentStatus="completed",
            paymentIntentId=payment_intent_id
        )
        
        registrations_db.append(registration.dict())
        
        payment_intent["status"] = "succeeded"
        
        return {
            "registration_id": registration_id,
            "message": "Registration confirmed successfully",
            "registration": registration
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm registration: {str(e)}")

@app.get("/api/registrations")
async def get_registrations():
    """Get all registrations (for admin purposes)"""
    return {
        "total": len(registrations_db),
        "registrations": registrations_db
    }

@app.get("/api/registration/{registration_id}")
async def get_registration(registration_id: str):
    """Get a specific registration by ID"""
    for registration in registrations_db:
        if registration["id"] == registration_id:
            return registration
    raise HTTPException(status_code=404, detail="Registration not found")

@app.post("/api/simulate-payment/{payment_intent_id}")
async def simulate_payment(payment_intent_id: str):
    """Simulate successful payment for demo purposes"""
    try:
        payment_intent = None
        for pi in payment_intents_db:
            if pi["id"] == payment_intent_id:
                payment_intent = pi
                break
        
        if not payment_intent:
            raise HTTPException(status_code=404, detail="Payment intent not found")
        
        payment_intent["status"] = "succeeded"
        
        result = await confirm_registration(payment_intent_id)
        
        return {
            "message": "Payment simulated successfully",
            "registration": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to simulate payment: {str(e)}")
