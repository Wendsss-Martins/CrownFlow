# SQLAlchemy Models for CrownFlow Multi-Tenant SaaS
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Numeric, Date, Time, Boolean
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    """User model supporting both Owner and Client roles"""
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    picture = Column(Text, nullable=True)
    role = Column(String(20), default='client')  # 'owner' or 'client'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    owned_businesses = relationship('Business', back_populates='owner', foreign_keys='Business.owner_id')
    sessions = relationship('UserSession', back_populates='user', cascade='all, delete-orphan')
    appointments = relationship('Appointment', back_populates='client', foreign_keys='Appointment.client_id')


class Business(Base):
    """Multi-tenant business (barbershop) model"""
    __tablename__ = 'businesses'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    # Business hours configuration (JSON-like string for simplicity)
    opening_time = Column(String(5), default='09:00')  # HH:MM format
    closing_time = Column(String(5), default='19:00')
    slot_duration = Column(Integer, default=30)  # minutes
    working_days = Column(String(50), default='1,2,3,4,5,6')  # 0=Sun, 1=Mon, ..., 6=Sat
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    owner = relationship('User', back_populates='owned_businesses', foreign_keys=[owner_id])
    services = relationship('Service', back_populates='business', cascade='all, delete-orphan')
    barbers = relationship('Barber', back_populates='business', cascade='all, delete-orphan')
    appointments = relationship('Appointment', back_populates='business', cascade='all, delete-orphan')


class UserSession(Base):
    """User session for authentication"""
    __tablename__ = 'user_sessions'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    session_token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    user = relationship('User', back_populates='sessions')


class Service(Base):
    """Services offered by the barbershop"""
    __tablename__ = 'services'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    duration_minutes = Column(Integer, nullable=False, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    business = relationship('Business', back_populates='services')
    appointments = relationship('Appointment', back_populates='service')


class Barber(Base):
    """Barbers working at the barbershop"""
    __tablename__ = 'barbers'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    specialty = Column(String(255), nullable=True)
    photo = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    business = relationship('Business', back_populates='barbers')
    appointments = relationship('Appointment', back_populates='barber')


class Appointment(Base):
    """Appointments/bookings"""
    __tablename__ = 'appointments'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey('businesses.id', ondelete='CASCADE'), nullable=False, index=True)
    client_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    service_id = Column(String(36), ForeignKey('services.id', ondelete='SET NULL'), nullable=True, index=True)
    barber_id = Column(String(36), ForeignKey('barbers.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Client info (for non-registered clients)
    client_name = Column(String(255), nullable=False)
    client_phone = Column(String(20), nullable=False)
    
    # Appointment details
    appointment_date = Column(Date, nullable=False, index=True)
    appointment_time = Column(Time, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    
    # Status: pending, confirmed, completed, cancelled
    status = Column(String(20), default='confirmed')
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    business = relationship('Business', back_populates='appointments')
    client = relationship('User', back_populates='appointments', foreign_keys=[client_id])
    service = relationship('Service', back_populates='appointments')
    barber = relationship('Barber', back_populates='appointments')
