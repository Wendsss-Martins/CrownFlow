// Type definitions for CrownFlow

export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'owner' | 'client';
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  business?: Business;
}

export interface ApiError {
  detail: string;
}
