from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
import uuid
import httpx
from datetime import datetime, timezone, timedelta

from database import get_db, engine, Base
from models import User, Business, UserSession

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (kept for compatibility)
mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
mongo_db = mongo_client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="CrownFlow API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Pydantic Models
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


class BusinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    slug: str
    owner_id: str
    created_at: datetime


class SessionRequest(BaseModel):
    session_id: str


class AuthResponse(BaseModel):
    user: UserResponse
    business: Optional[BusinessResponse] = None


# Auth Helper
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    
    # Find session
    result = await db.execute(
        select(UserSession)
        .options(selectinload(UserSession.user))
        .where(UserSession.session_token == session_token)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=401, detail="Sessão inválida")
    
    # Check expiry
    if session.expires_at.tzinfo is None:
        session.expires_at = session.expires_at.replace(tzinfo=timezone.utc)
    
    if session.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Sessão expirada")
    
    return session.user


# Routes
@api_router.get("/")
async def root():
    return {"message": "CrownFlow API v1.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Auth Routes
@api_router.post("/auth/session")
async def exchange_session(
    request: SessionRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Exchange Emergent Auth session_id for user data and set session cookie"""
    try:
        # Call Emergent Auth to get session data
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
        
        # Check if user exists
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Update existing user
            user.name = name
            user.picture = picture
            user.updated_at = datetime.now(timezone.utc)
        else:
            # Create new user as Owner (first time = owner)
            user = User(
                id=str(uuid.uuid4()),
                email=email,
                name=name,
                picture=picture,
                role='owner'  # New users start as owners
            )
            db.add(user)
        
        # Create session
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
        
        # Get user's business if owner
        business = None
        if user.role == 'owner':
            result = await db.execute(
                select(Business).where(Business.owner_id == user.id)
            )
            business = result.scalar_one_or_none()
        
        # Set httpOnly cookie
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60  # 7 days
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
        result = await db.execute(
            select(Business).where(Business.owner_id == user.id)
        )
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
        # Delete session from database
        result = await db.execute(
            select(UserSession).where(UserSession.session_token == session_token)
        )
        session = result.scalar_one_or_none()
        if session:
            await db.delete(session)
            await db.commit()
    
    # Clear cookie
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"message": "Logout realizado com sucesso"}


# Business Routes
@api_router.post("/business", response_model=BusinessResponse)
async def create_business(
    business_data: BusinessCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new business (barbershop)"""
    if user.role != 'owner':
        raise HTTPException(status_code=403, detail="Apenas donos podem criar barbearias")
    
    # Check if user already has a business
    result = await db.execute(
        select(Business).where(Business.owner_id == user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Você já possui uma barbearia cadastrada")
    
    # Check if slug is available
    result = await db.execute(
        select(Business).where(Business.slug == business_data.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este slug já está em uso")
    
    # Create business
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
    
    result = await db.execute(
        select(Business).where(Business.owner_id == user.id)
    )
    business = result.scalar_one_or_none()
    
    if not business:
        return None
    
    return BusinessResponse.model_validate(business)


@api_router.get("/business/{slug}", response_model=BusinessResponse)
async def get_business_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get business by slug (public endpoint for clients)"""
    result = await db.execute(
        select(Business).where(Business.slug == slug)
    )
    business = result.scalar_one_or_none()
    
    if not business:
        raise HTTPException(status_code=404, detail="Barbearia não encontrada")
    
    return BusinessResponse.model_validate(business)


# Include the router in the main app
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
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


@app.on_event("shutdown")
async def shutdown():
    mongo_client.close()
    await engine.dispose()
