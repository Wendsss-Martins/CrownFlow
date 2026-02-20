from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import uuid
import httpx
from datetime import datetime, timezone, timedelta, date, time
from decimal import Decimal

from database import get_db, engine, Base
from models import User, Business, UserSession, Service, Barber, Appointment

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (kept for compatibility)
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
mongo_db = mongo_client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="CrownFlow API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== Pydantic Models ====================

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str
    created_at: datetime


class BusinessCreate(BaseModel):
    name: str
    slug: str


class BusinessUpdate(BaseModel):
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    slot_duration: Optional[int] = None
    working_days: Optional[str] = None


class BusinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    owner_id: str
    opening_time: str
    closing_time: str
    slot_duration: int
    working_days: str
    created_at: datetime


class SessionRequest(BaseModel):
    session_id: str


class AuthResponse(BaseModel):
    user: UserResponse
    business: Optional[BusinessResponse] = None


# Service Models
class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int = 30


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    business_id: str
    name: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    is_active: bool
    created_at: datetime


# Barber Models
class BarberCreate(BaseModel):
    name: str
    specialty: Optional[str] = None
    photo: Optional[str] = None


class BarberUpdate(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    photo: Optional[str] = None
    is_active: Optional[bool] = None


class BarberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    business_id: str
    name: str
    specialty: Optional[str] = None
    photo: Optional[str] = None
    is_active: bool
    created_at: datetime


# Appointment Models
class AppointmentCreate(BaseModel):
    service_id: str
    barber_id: str
    appointment_date: date
    appointment_time: time
    client_name: str
    client_phone: str
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    business_id: str
    client_id: Optional[str] = None
    service_id: Optional[str] = None
    barber_id: Optional[str] = None
    client_name: str
    client_phone: str
    appointment_date: date
    appointment_time: time
    duration_minutes: int
    status: str
    notes: Optional[str] = None
    created_at: datetime
    service: Optional[ServiceResponse] = None
    barber: Optional[BarberResponse] = None


class TimeSlot(BaseModel):
    time: str
    available: bool


class AvailableSlotsResponse(BaseModel):
    date: date
    slots: List[TimeSlot]


# ==================== Auth Helper ====================

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    result = await db.execute(
        select(UserSession)
        .options(selectinload(UserSession.user))
        .where(UserSession.session_token == session_token)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    
    if session.expires_at.tzinfo is None:
        session.expires_at = session.expires_at.replace(tzinfo=timezone.utc)
    
    if session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessão expirada")
    
    return session.user


async def get_current_user_optional(request: Request, db: AsyncSession = Depends(get_db)) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None


async def get_user_business(user: User, db: AsyncSession) -> Business:
    """Get the business owned by the user"""
    result = await db.execute(
        select(Business).where(Business.owner_id == user.id)
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Você não possui uma barbearia cadastrada")
    return business


# ==================== Routes ====================

@api_router.get("/")
async def root():
    return {"message": "CrownFlow API v2.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ==================== Auth Routes ====================

@api_router.post("/auth/session")
async def exchange_session(
    request: SessionRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Exchange Emergent Auth session_id for user data and set session cookie"""
    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id},
                timeout=10.0
            )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Sessão inválida")
        
        auth_data = auth_response.json()
        email = auth_data.get("email")
        name = auth_data.get("name")
        picture = auth_data.get("picture")
        session_token = auth_data.get("session_token")
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            user.name = name
            user.picture = picture
            user.updated_at = datetime.now(timezone.utc)
        else:
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                name=name,
                picture=picture,
                role='owner'
            )
            db.add(user)
        
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        user_session = UserSession(
            id=str(uuid.uuid4()),
            user_id=user.id,
            session_token=session_token,
            expires_at=expires_at
        )
        db.add(user_session)
        await db.commit()
        await db.refresh(user)
        
        business = None
        if user.role == 'owner':
            result = await db.execute(select(Business).where(Business.owner_id == user.id))
            business = result.scalar_one_or_none()
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        return AuthResponse(
            user=UserResponse.model_validate(user),
            business=BusinessResponse.model_validate(business) if business else None
        )
        
    except httpx.RequestError as e:
        logger.error(f"Error calling Emergent Auth: {e}")
        raise HTTPException(status_code=500, detail="Erro ao autenticar")


@api_router.get("/auth/me", response_model=AuthResponse)
async def get_me(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user"""
    business = None
    if user.role == 'owner':
        result = await db.execute(select(Business).where(Business.owner_id == user.id))
        business = result.scalar_one_or_none()
    
    return AuthResponse(
        user=UserResponse.model_validate(user),
        business=BusinessResponse.model_validate(business) if business else None
    )


@api_router.post("/auth/logout")
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Logout user and clear session"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        result = await db.execute(
            select(UserSession).where(UserSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
    
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logout realizado com sucesso"}


# ==================== Business Routes ====================

@api_router.post("/business", response_model=BusinessResponse)
async def create_business(
    business_data: BusinessCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new business (barbershop)"""
    if user.role != 'owner':
        raise HTTPException(status_code=403, detail="Apenas donos podem criar barbearias")
    
    result = await db.execute(select(Business).where(Business.owner_id == user.id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Você já possui uma barbearia cadastrada")
    
    result = await db.execute(select(Business).where(Business.slug == business_data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este slug já está em uso")
    
    business = Business(
        id=str(uuid.uuid4()),
        name=business_data.name,
        slug=business_data.slug,
        owner_id=user.id
    )
    db.add(business)
    await db.commit()
    await db.refresh(business)
    
    return BusinessResponse.model_validate(business)


@api_router.get("/business/me", response_model=Optional[BusinessResponse])
async def get_my_business(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's business"""
    if user.role != 'owner':
        return None
    
    result = await db.execute(select(Business).where(Business.owner_id == user.id))
    business = result.scalar_one_or_none()
    
    if not business:
        return None
    
    return BusinessResponse.model_validate(business)


@api_router.patch("/business/me", response_model=BusinessResponse)
async def update_my_business(
    business_data: BusinessUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update business settings"""
    business = await get_user_business(user, db)
    
    if business_data.opening_time:
        business.opening_time = business_data.opening_time
    if business_data.closing_time:
        business.closing_time = business_data.closing_time
    if business_data.slot_duration:
        business.slot_duration = business_data.slot_duration
    if business_data.working_days:
        business.working_days = business_data.working_days
    
    await db.commit()
    await db.refresh(business)
    
    return BusinessResponse.model_validate(business)


@api_router.get("/business/{slug}", response_model=BusinessResponse)
async def get_business_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get business by slug (public endpoint)"""
    result = await db.execute(select(Business).where(Business.slug == slug))
    business = result.scalar_one_or_none()
    
    if not business:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    return BusinessResponse.model_validate(business)


# ==================== Service Routes ====================

@api_router.post("/services", response_model=ServiceResponse)
async def create_service(
    service_data: ServiceCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new service"""
    business = await get_user_business(user, db)
    
    service = Service(
        id=str(uuid.uuid4()),
        business_id=business.id,
        name=service_data.name,
        description=service_data.description,
        price=Decimal(str(service_data.price)),
        duration_minutes=service_data.duration_minutes
    )
    db.add(service)
    await db.commit()
    await db.refresh(service)
    
    return ServiceResponse.model_validate(service)


@api_router.get("/services", response_model=List[ServiceResponse])
async def list_services(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all services for the user's business"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Service)
        .where(Service.business_id == business.id)
        .order_by(Service.name)
    )
    services = result.scalars().all()
    
    return [ServiceResponse.model_validate(s) for s in services]


@api_router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific service"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.business_id == business.id)
        )
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    return ServiceResponse.model_validate(service)


@api_router.patch("/services/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    service_data: ServiceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a service"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.business_id == business.id)
        )
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    if service_data.name is not None:
        service.name = service_data.name
    if service_data.description is not None:
        service.description = service_data.description
    if service_data.price is not None:
        service.price = Decimal(str(service_data.price))
    if service_data.duration_minutes is not None:
        service.duration_minutes = service_data.duration_minutes
    if service_data.is_active is not None:
        service.is_active = service_data.is_active
    
    await db.commit()
    await db.refresh(service)
    
    return ServiceResponse.model_validate(service)


@api_router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a service"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.business_id == business.id)
        )
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    await db.delete(service)
    await db.commit()
    
    return {"message": "Serviço removido com sucesso"}


# ==================== Barber Routes ====================

@api_router.post("/barbers", response_model=BarberResponse)
async def create_barber(
    barber_data: BarberCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new barber"""
    business = await get_user_business(user, db)
    
    barber = Barber(
        id=str(uuid.uuid4()),
        business_id=business.id,
        name=barber_data.name,
        specialty=barber_data.specialty,
        photo=barber_data.photo
    )
    db.add(barber)
    await db.commit()
    await db.refresh(barber)
    
    return BarberResponse.model_validate(barber)


@api_router.get("/barbers", response_model=List[BarberResponse])
async def list_barbers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all barbers for the user's business"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Barber)
        .where(Barber.business_id == business.id)
        .order_by(Barber.name)
    )
    barbers = result.scalars().all()
    
    return [BarberResponse.model_validate(b) for b in barbers]


@api_router.patch("/barbers/{barber_id}", response_model=BarberResponse)
async def update_barber(
    barber_id: str,
    barber_data: BarberUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a barber"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Barber).where(
            and_(Barber.id == barber_id, Barber.business_id == business.id)
        )
    )
    barber = result.scalar_one_or_none()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado")
    
    if barber_data.name is not None:
        barber.name = barber_data.name
    if barber_data.specialty is not None:
        barber.specialty = barber_data.specialty
    if barber_data.photo is not None:
        barber.photo = barber_data.photo
    if barber_data.is_active is not None:
        barber.is_active = barber_data.is_active
    
    await db.commit()
    await db.refresh(barber)
    
    return BarberResponse.model_validate(barber)


@api_router.delete("/barbers/{barber_id}")
async def delete_barber(
    barber_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a barber"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Barber).where(
            and_(Barber.id == barber_id, Barber.business_id == business.id)
        )
    )
    barber = result.scalar_one_or_none()
    
    if not barber:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado")
    
    await db.delete(barber)
    await db.commit()
    
    return {"message": "Barbeiro removido com sucesso"}


# ==================== Public Routes (for booking) ====================

@api_router.get("/public/{slug}/services", response_model=List[ServiceResponse])
async def get_public_services(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get services for a business (public)"""
    result = await db.execute(select(Business).where(Business.slug == slug))
    business = result.scalar_one_or_none()
    
    if not business:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    result = await db.execute(
        select(Service)
        .where(and_(Service.business_id == business.id, Service.is_active == True))
        .order_by(Service.name)
    )
    services = result.scalars().all()
    
    return [ServiceResponse.model_validate(s) for s in services]


@api_router.get("/public/{slug}/barbers", response_model=List[BarberResponse])
async def get_public_barbers(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get barbers for a business (public)"""
    result = await db.execute(select(Business).where(Business.slug == slug))
    business = result.scalar_one_or_none()
    
    if not business:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    result = await db.execute(
        select(Barber)
        .where(and_(Barber.business_id == business.id, Barber.is_active == True))
        .order_by(Barber.name)
    )
    barbers = result.scalars().all()
    
    return [BarberResponse.model_validate(b) for b in barbers]


@api_router.get("/public/{slug}/slots", response_model=AvailableSlotsResponse)
async def get_available_slots(
    slug: str,
    barber_id: str,
    service_id: str,
    date_str: str = Query(..., alias="date"),
    db: AsyncSession = Depends(get_db)
):
    """Get available time slots for a specific date, barber, and service"""
    # Get business
    result = await db.execute(select(Business).where(Business.slug == slug))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    # Get service for duration
    result = await db.execute(
        select(Service).where(
            and_(Service.id == service_id, Service.business_id == business.id)
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    # Parse date
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Data inválida. Use formato YYYY-MM-DD")
    
    # Check if date is a working day
    day_of_week = target_date.weekday() + 1  # 1=Mon, ..., 7=Sun; convert to 0=Sun, 1=Mon
    if target_date.weekday() == 6:
        day_of_week = 0
    
    working_days = [int(d) for d in business.working_days.split(',')]
    if day_of_week not in working_days:
        return AvailableSlotsResponse(date=target_date, slots=[])
    
    # Generate time slots based on business hours
    opening = datetime.strptime(business.opening_time, "%H:%M").time()
    closing = datetime.strptime(business.closing_time, "%H:%M").time()
    slot_duration = business.slot_duration
    
    # Get existing appointments for this barber on this date
    result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.business_id == business.id,
                Appointment.barber_id == barber_id,
                Appointment.appointment_date == target_date,
                Appointment.status.in_(['pending', 'confirmed'])
            )
        )
    )
    existing_appointments = result.scalars().all()
    
    # Build list of occupied time ranges
    occupied_ranges = []
    for appt in existing_appointments:
        start = datetime.combine(target_date, appt.appointment_time)
        end = start + timedelta(minutes=appt.duration_minutes)
        occupied_ranges.append((start, end))
    
    # Generate available slots
    slots = []
    current = datetime.combine(target_date, opening)
    end_of_day = datetime.combine(target_date, closing)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    while current + timedelta(minutes=service.duration_minutes) <= end_of_day:
        slot_end = current + timedelta(minutes=service.duration_minutes)
        
        # Check if slot is in the past
        if target_date == datetime.now(timezone.utc).date() and current <= now:
            slots.append(TimeSlot(time=current.strftime("%H:%M"), available=False))
            current += timedelta(minutes=slot_duration)
            continue
        
        # Check if slot overlaps with any existing appointment
        is_available = True
        for occ_start, occ_end in occupied_ranges:
            if not (slot_end <= occ_start or current >= occ_end):
                is_available = False
                break
        
        slots.append(TimeSlot(time=current.strftime("%H:%M"), available=is_available))
        current += timedelta(minutes=slot_duration)
    
    return AvailableSlotsResponse(date=target_date, slots=slots)


@api_router.post("/public/{slug}/book", response_model=AppointmentResponse)
async def create_booking(
    slug: str,
    booking_data: AppointmentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new appointment (public booking)"""
    # Get business
    result = await db.execute(select(Business).where(Business.slug == slug))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    # Validate service
    result = await db.execute(
        select(Service).where(
            and_(Service.id == booking_data.service_id, Service.business_id == business.id)
        )
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    
    # Validate barber
    result = await db.execute(
        select(Barber).where(
            and_(Barber.id == booking_data.barber_id, Barber.business_id == business.id)
        )
    )
    barber = result.scalar_one_or_none()
    if not barber:
        raise HTTPException(status_code=404, detail="Barbeiro não encontrado")
    
    # Check for conflicting appointments
    appointment_start = datetime.combine(booking_data.appointment_date, booking_data.appointment_time)
    appointment_end = appointment_start + timedelta(minutes=service.duration_minutes)
    
    result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.business_id == business.id,
                Appointment.barber_id == booking_data.barber_id,
                Appointment.appointment_date == booking_data.appointment_date,
                Appointment.status.in_(['pending', 'confirmed'])
            )
        )
    )
    existing_appointments = result.scalars().all()
    
    for appt in existing_appointments:
        appt_start = datetime.combine(appt.appointment_date, appt.appointment_time)
        appt_end = appt_start + timedelta(minutes=appt.duration_minutes)
        
        if not (appointment_end <= appt_start or appointment_start >= appt_end):
            raise HTTPException(status_code=400, detail="Este horário não está mais disponível")
    
    # Create appointment
    appointment = Appointment(
        id=str(uuid.uuid4()),
        business_id=business.id,
        service_id=service.id,
        barber_id=barber.id,
        client_name=booking_data.client_name,
        client_phone=booking_data.client_phone,
        appointment_date=booking_data.appointment_date,
        appointment_time=booking_data.appointment_time,
        duration_minutes=service.duration_minutes,
        status='confirmed',
        notes=booking_data.notes
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    # Load relationships
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.service), selectinload(Appointment.barber))
        .where(Appointment.id == appointment.id)
    )
    appointment = result.scalar_one()
    
    return AppointmentResponse.model_validate(appointment)


# ==================== Appointment Routes (Admin) ====================

@api_router.get("/appointments", response_model=List[AppointmentResponse])
async def list_appointments(
    date_str: Optional[str] = Query(None, alias="date"),
    status: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List appointments for the user's business"""
    business = await get_user_business(user, db)
    
    query = select(Appointment).options(
        selectinload(Appointment.service),
        selectinload(Appointment.barber)
    ).where(Appointment.business_id == business.id)
    
    if date_str:
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            query = query.where(Appointment.appointment_date == target_date)
        except ValueError:
            pass
    
    if status:
        query = query.where(Appointment.status == status)
    
    query = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time)
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    return [AppointmentResponse.model_validate(a) for a in appointments]


@api_router.get("/appointments/today", response_model=List[AppointmentResponse])
async def list_today_appointments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List today's appointments"""
    business = await get_user_business(user, db)
    today = datetime.now(timezone.utc).date()
    
    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.service), selectinload(Appointment.barber))
        .where(
            and_(
                Appointment.business_id == business.id,
                Appointment.appointment_date == today
            )
        )
        .order_by(Appointment.appointment_time)
    )
    appointments = result.scalars().all()
    
    return [AppointmentResponse.model_validate(a) for a in appointments]


@api_router.get("/appointments/stats")
async def get_appointments_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get appointment statistics"""
    business = await get_user_business(user, db)
    today = datetime.now(timezone.utc).date()
    month_start = today.replace(day=1)
    
    # Today's count
    result = await db.execute(
        select(func.count(Appointment.id)).where(
            and_(
                Appointment.business_id == business.id,
                Appointment.appointment_date == today,
                Appointment.status.in_(['pending', 'confirmed'])
            )
        )
    )
    today_count = result.scalar() or 0
    
    # Month's count
    result = await db.execute(
        select(func.count(Appointment.id)).where(
            and_(
                Appointment.business_id == business.id,
                Appointment.appointment_date >= month_start,
                Appointment.status.in_(['pending', 'confirmed', 'completed'])
            )
        )
    )
    month_count = result.scalar() or 0
    
    # Month's revenue
    result = await db.execute(
        select(func.sum(Service.price))
        .select_from(Appointment)
        .join(Service, Appointment.service_id == Service.id)
        .where(
            and_(
                Appointment.business_id == business.id,
                Appointment.appointment_date >= month_start,
                Appointment.status.in_(['confirmed', 'completed'])
            )
        )
    )
    month_revenue = result.scalar() or 0
    
    # Unique clients this month
    result = await db.execute(
        select(func.count(func.distinct(Appointment.client_phone))).where(
            and_(
                Appointment.business_id == business.id,
                Appointment.appointment_date >= month_start
            )
        )
    )
    unique_clients = result.scalar() or 0
    
    return {
        "today_appointments": today_count,
        "month_appointments": month_count,
        "month_revenue": float(month_revenue),
        "unique_clients": unique_clients
    }


@api_router.patch("/appointments/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an appointment"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Appointment).where(
            and_(Appointment.id == appointment_id, Appointment.business_id == business.id)
        )
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    appointment.status = 'cancelled'
    appointment.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Agendamento cancelado com sucesso"}


@api_router.patch("/appointments/{appointment_id}/complete")
async def complete_appointment(
    appointment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark appointment as completed"""
    business = await get_user_business(user, db)
    
    result = await db.execute(
        select(Appointment).where(
            and_(Appointment.id == appointment_id, Appointment.business_id == business.id)
        )
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    appointment.status = 'completed'
    appointment.updated_at = datetime.now(timezone.utc)
    await db.commit()
    
    return {"message": "Agendamento concluído com sucesso"}


# ==================== App Configuration ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


@app.on_event("shutdown")
async def shutdown():
    mongo_client.close()
    await engine.dispose()
