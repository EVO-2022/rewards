# Rewards Platform - Development Journal

**Last Updated:** 2024-12-19  
**Status:** Active Development  
**Environment:** Development (Local PostgreSQL)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Completed Features](#completed-features)
- [In Progress](#in-progress)
- [Planned Features](#planned-features)
- [Known Issues](#known-issues)
- [Technical Decisions](#technical-decisions)
- [Deployment Notes](#deployment-notes)
- [Change Log](#change-log)

---

## 🎯 Project Overview

**Product:** Web2 rewards platform with Web3-style ledger foundation

**Core Concept:**
- Web2 frontend, Web3-style ledger backend
- Off-chain database for speed (on-chain optional later)
- Points are accounting entries (mint/burn ledger), not tradable tokens
- Multi-tenant brand system with role-based access

**Core Loop:**
```
Customer purchases → Webhook fires → Points minted → Balance tracked → Customer redeems → Points burned
```

**Tech Stack:**
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL (local for dev, Ubuntu server for production)
- ORM: Prisma
- Auth: Clerk (DISABLED in dev mode)
- Webhooks: Provider-agnostic (Shopify, Stripe)

---

## ✅ Completed Features

### Infrastructure & Setup
- [x] **Project Structure** - Full TypeScript + Express setup
- [x] **Database Schema** - All 8 core models (User, Brand, BrandMember, Campaign, RewardLedger, Redemption, FraudFlag, WebhookEvent)
- [x] **Prisma ORM** - Schema, migrations, seed script
- [x] **Local PostgreSQL** - Database created, admin user configured
- [x] **Dev Tooling** - ESLint, Prettier, ts-node-dev
- [x] **Environment Config** - .env setup with validation

### Core Functionality
- [x] **Webhook Ingestion** - `POST /api/webhooks/ingest`
  - Saves raw webhook payload
  - Creates user if missing
  - Finds active brand
  - Mints rewards into ledger
  - Marks webhook as processed
  - **Status:** ✅ WORKING (verified with localtest@example.com → 24 points)

- [x] **Reward Minting** - Automatic point issuance from webhooks
  - Ledger entries created (type: MINT)
  - Balance calculation: SUM(MINT) - SUM(BURN)
  - **Status:** ✅ WORKING

- [x] **Balance Tracking** - Accurate point balance calculation
  - Per-brand, per-user balance
  - Real-time ledger aggregation
  - **Status:** ✅ WORKING

### Dev Tools (Development Only)
- [x] **Dev Auth Bypass** - Clerk completely disabled in dev mode
  - Fake dev user injected automatically
  - No tokens/headers required
  - **Status:** ✅ WORKING

- [x] **Dev-Only Endpoints**
  - `GET /__dev/brands` - List active brands (no auth)
  - `GET /__dev/balance?email=EMAIL&brandId=BRAND_ID` - Get balance (no auth)
  - **Status:** ✅ WORKING

### API Structure
- [x] **Brand Management** - CRUD operations
- [x] **Team Management** - Member roles (OWNER, MANAGER, VIEWER)
- [x] **Campaign Management** - Campaign CRUD
- [x] **Points Management** - Issue/burn endpoints
- [x] **Fraud Detection** - Velocity checks, large amount detection
- [x] **Admin System** - Platform admin controls

---

## 🚧 In Progress

### Current Sprint
- [ ] **Ubuntu Server Deployment** - Setting up production environment
  - PostgreSQL on Ubuntu server
  - Remote access configuration
  - SSH access for developers

---

## 📝 Planned Features

### High Priority
- [ ] **Redemption System** (Burn Points)
  - Endpoint: `POST /api/brands/:brandId/redemptions`
  - Balance validation before burn
  - Campaign association
  - Status: ❌ NOT BUILT

- [ ] **Standard Balance API** (Non-Dev)
  - Authenticated balance endpoint
  - User-specific balance retrieval
  - Status: ❌ NOT BUILT

- [ ] **Campaign Rule Logic**
  - Points per dollar configuration
  - Campaign activation/deactivation
  - Date range enforcement
  - Status: ❌ NOT BUILT

### Medium Priority
- [ ] **Brand Admin Tooling**
  - Dashboard endpoints
  - Team management UI
  - Campaign configuration UI
  - Status: ❌ NOT BUILT

- [ ] **Production Auth Re-Enable**
  - Clerk authentication enforcement
  - Brand permission enforcement
  - Platform admin protection
  - Status: ⛔ INTENTIONALLY DISABLED

- [ ] **Fraud Scoring UI**
  - Fraud flag review interface
  - Admin review workflows
  - Status: ❌ NOT BUILT

### Low Priority / Future
- [ ] **Frontend Application**
  - Customer wallet UI
  - Brand admin dashboards
  - Status: ❌ NOT BUILT

- [ ] **POS Integration**
  - Point-of-sale system integration
  - Real-time redemption
  - Status: ❌ NOT BUILT

- [ ] **Shopify App**
  - Native Shopify integration
  - App installation flow
  - Status: ❌ NOT BUILT

- [ ] **Stripe Billing Linkage**
  - Subscription management
  - Payment processing
  - Status: ❌ NOT BUILT (stub exists)

- [ ] **On-Chain Settlement**
  - Blockchain integration
  - Optional on-chain ledger
  - Status: ❌ NOT BUILT

---

## 🐛 Known Issues

### Database Connection
- **Issue:** Prisma migration fails when connecting to remote database `db.evo-rewards.xyz:5432`
- **Error:** `P1001: Can't reach database server`
- **Context:** Trying to run migrations from local Mac to remote Ubuntu server
- **Status:** 🔄 IN PROGRESS
- **Solution Approach:**
  - Local dev: Use local PostgreSQL or accessible remote connection
  - Ubuntu server: Use `localhost:5432` connection string
  - Need separate `.env` files for local vs production

### Environment Configuration
- **Issue:** Single `.env` file doesn't support local dev + production server scenarios
- **Status:** 🔄 NEEDS RESOLUTION
- **Proposed Solution:**
  - `.env.local` for local development
  - `.env.production` for Ubuntu server
  - Environment-specific loading logic

---

## 🔧 Technical Decisions

### Architecture Decisions
1. **Off-Chain First Approach**
   - Ledger simulation in database (no blockchain yet)
   - ERC-20 style mint/burn operations
   - On-chain optional for future

2. **Dev Mode Auth Bypass**
   - Clerk completely disabled in development
   - Fake user injection for testing
   - Production auth will be enforced later

3. **Provider-Agnostic Webhooks**
   - Normalized webhook format
   - Supports Shopify, Stripe, and future providers
   - Raw payload storage for debugging

4. **Multi-Tenant Isolation**
   - Per-brand point systems
   - Brand-level access control
   - Isolated ledger entries

### Database Design
- **Balance Calculation:** `SUM(MINT) - SUM(BURN)` per brand/user
- **No Transfers:** Points cannot be transferred between users
- **Immutable Ledger:** All mint/burn operations are logged
- **Fraud Tracking:** Separate FraudFlag table for suspicious activity

---

## 🚀 Deployment Notes

### Local Development
- **Database:** Local PostgreSQL
- **Port:** 3000
- **Command:** `npm run dev`
- **Environment:** `NODE_ENV=development`

### Ubuntu Server (Planned)
- **Database:** PostgreSQL on same server (`localhost:5432`)
- **Access:** SSH for developers
- **Environment:** `NODE_ENV=production`
- **Status:** 🔄 SETUP IN PROGRESS

### Migration Strategy
- Run migrations on server after deployment
- Use `npm run prisma:migrate deploy` for production
- Seed script available for initial data

---

## 📅 Change Log

### 2024-12-19
- **Initial Project Setup**
  - Created full TypeScript + Express backend
  - Implemented all database models
  - Set up Prisma ORM with migrations
  - Created webhook ingestion system
  - Implemented reward minting
  - Added dev-only endpoints for testing
  - Disabled Clerk auth in dev mode

- **Current Working State:**
  - Webhook ingestion: ✅ WORKING
  - Reward minting: ✅ WORKING
  - Balance tracking: ✅ WORKING
  - Dev endpoints: ✅ WORKING

- **Known Issues:**
  - Database connection for remote server needs configuration
  - Environment variable management needs improvement

---

## 📊 Current Platform Status

| Category | Status | Notes |
|----------|--------|-------|
| Local Dev Stack | ✅ Working | PostgreSQL local |
| Database | ✅ Working | Migrated and seeded |
| Webhooks | ✅ Working | Ingestion verified |
| Minting | ✅ Working | Points issued correctly |
| Balance Read | ✅ Working | Dev endpoint verified |
| Auth System | ⛔ Dev Bypassed | Clerk disabled |
| Redemption | ❌ Not Built | Burn system needed |
| Frontend | ❌ Not Built | API only |
| POS | ❌ Not Built | Future feature |
| On-Chain | ❌ Not Built | Optional future |

---

## 🎯 Immediate Next Steps

1. **Fix Database Connection**
   - Configure local `.env` for development
   - Set up production `.env` for Ubuntu server
   - Test migrations on both environments

2. **Build Redemption System**
   - Implement burn endpoint
   - Add balance validation
   - Test redemption flow

3. **Standardize Balance API**
   - Create authenticated balance endpoint
   - Remove dependency on dev-only endpoints

4. **Campaign Logic**
   - Implement points per dollar rules
   - Add campaign activation logic

---

## 📝 Notes

### Development Rules
- Always use `NODE_ENV=development` for local dev
- Always run `npm run dev` for development
- Use `/__dev/*` endpoints for testing
- DO NOT enforce Clerk in dev mode
- DO NOT attach blockchain yet

### Testing Status
- ✅ Webhook ingestion tested
- ✅ Minting verified (24 points to localtest@example.com)
- ✅ Balance retrieval verified
- ❌ Redemption not tested (not built)
- ❌ Auth flow not tested (disabled)

---

**This journal is the source of truth for project status. Update regularly as work progresses.**

