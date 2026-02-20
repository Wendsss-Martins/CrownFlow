# SQLAlchemy Models for CrownFlow Multi-Tenant SaaS
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Index
from sqlalchemy.orm import relationship
from database import Base


def generate_uuid():
    return str(uuid.uuid4())


class Business(Base):
    """Multi-tenant business (barbershop) model"""
    __tablename__ = 'businesses'
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    owner = relationship('User', back_populates='owned_businesses', foreign_keys=[owner_id])
    
    __table_args__ = (
        Index('ix_businesses_slug', 'slug'),
        Index('ix_businesses_owner', 'owner_id'),
    )


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
    
    __table_args__ = (
        Index('ix_users_email', 'email'),
    )


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
    
    __table_args__ = (
        Index('ix_user_sessions_token', 'session_token'),
        Index('ix_user_sessions_user', 'user_id'),
    )
