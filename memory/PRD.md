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
