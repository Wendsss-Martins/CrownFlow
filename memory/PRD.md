# CrownFlow - PRD (Product Requirements Document)

## Original Problem Statement
Sistema SaaS para agendamento de barbearias chamado CrownFlow.

**Stack obrigatória:**
- React + Tailwind CSS
- Supabase (PostgreSQL em nuvem)
- Autenticação social (Google OAuth)

**Requisitos da Fase 1:**
1. Multi-tenant com businesses table
2. Autenticação (Owner e Cliente)
3. Dashboard protegido
4. Landing page pública
5. Design: Preto, Grafite, Branco, Detalhes dourado
6. Mobile-first

---

## User Personas

### 1. Owner (Dono da Barbearia)
- Gerencia agendamentos
- Configura serviços e horários
- Visualiza relatórios
- Acessa dashboard completo

### 2. Cliente
- Agenda serviços online
- Visualiza histórico
- Recebe notificações

---

## Core Requirements (Static)

### Multi-Tenant Architecture
- Tabela `businesses` com `id`, `name`, `slug`, `owner_id`
- Todas as tabelas futuras devem conter `business_id`
- Row Level Security no Supabase

### Autenticação
- Google OAuth via Emergent Auth
- Session tokens com 7 dias de validade
- Cookies httpOnly para segurança

### Design System
- Cores: #0a0a0a (preto), #121212 (grafite), #D4AF37 (dourado)
- Fonte headings: Playfair Display
- Fonte body: Manrope
- Bordas: rounded-none (sharp edges)

---

## What's Been Implemented (Fase 1)

### Date: 2026-02-20

**Backend:**
- [x] FastAPI com SQLAlchemy async
- [x] Supabase PostgreSQL connection (Transaction Pooler)
- [x] Models: User, Business, UserSession
- [x] Endpoints: /api/health, /api/auth/session, /api/auth/me, /api/auth/logout
- [x] Endpoints: /api/business, /api/business/me, /api/business/{slug}
- [x] Google OAuth via Emergent Auth integration
- [x] Session management com cookies httpOnly

**Frontend:**
- [x] Landing page com Hero, Features, About, CTA sections
- [x] Dashboard protegido com Sidebar
- [x] Mobile navigation (bottom nav)
- [x] Auth flow completo (login, callback, logout)
- [x] Create business modal para owners
- [x] Design dark premium implementado
- [x] Responsivo mobile-first

---

## Prioritized Backlog

### P0 - Critical (Próxima fase)
- [ ] Sistema de agendamento completo
- [ ] Cadastro de serviços (corte, barba, etc.)
- [ ] Configuração de horários de funcionamento
- [ ] Página pública da barbearia (/{slug})

### P1 - Important
- [ ] Gestão de clientes
- [ ] Notificações (email/SMS)
- [ ] Calendário visual
- [ ] Relatórios básicos

### P2 - Nice to Have
- [ ] Múltiplos profissionais por barbearia
- [ ] Pagamentos online
- [ ] Sistema de fidelidade
- [ ] Reviews e avaliações

---

## Next Tasks

1. **Fase 2: Agendamento**
   - Criar tabelas: services, time_slots, appointments
   - Implementar CRUD de serviços
   - Criar calendário de disponibilidade
   - Página de agendamento público

2. **Fase 3: Gestão**
   - Lista de clientes
   - Histórico de agendamentos
   - Dashboard com métricas reais

---

## Technical Notes

- **Database:** Supabase PostgreSQL (Transaction Pooler)
- **Auth:** Emergent Google OAuth
- **Frontend:** React 19 + Tailwind + Shadcn/UI
- **Backend:** FastAPI + SQLAlchemy (async)

---

## Phase 2 Implementation - 2026-02-20

### New Database Tables
- **services**: id, business_id, name, description, price, duration_minutes, is_active
- **barbers**: id, business_id, name, specialty, photo, is_active
- **appointments**: id, business_id, client_id, service_id, barber_id, client_name, client_phone, appointment_date, appointment_time, duration_minutes, status

### Business Rules Implemented
- [x] No duplicate bookings for same barber/time (conflict detection)
- [x] Time slots blocked after booking
- [x] Configurable business hours (opening_time, closing_time)
- [x] Configurable slot duration (default 30min)
- [x] Working days configuration (Mon-Sat by default)

### Client Booking Flow
1. Select service → Shows price and duration
2. Select barber → Shows name and specialty
3. Select date → Shows only working days
4. Select time → Shows available slots only
5. Enter name and phone → Required fields
6. Confirm → Creates appointment

### Admin Dashboard Features
- [x] Stats: Today's appointments, month total, revenue, unique clients
- [x] Tabs: Agendamentos, Serviços, Barbeiros
- [x] Date filter for appointments
- [x] Cancel/Complete appointment actions
- [x] CRUD for services
- [x] CRUD for barbers
- [x] Copy booking link button

### API Endpoints Added
- POST/GET/PATCH/DELETE /api/services
- POST/GET/PATCH/DELETE /api/barbers
- GET /api/appointments (with date filter)
- GET /api/appointments/stats
- PATCH /api/appointments/{id}/cancel
- PATCH /api/appointments/{id}/complete
- GET /api/public/{slug}/services
- GET /api/public/{slug}/barbers
- GET /api/public/{slug}/slots
- POST /api/public/{slug}/book

---
