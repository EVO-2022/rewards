# CLAUDE.md - Project Analysis & Development Guide

> Auto-generated analysis of the rewards repository with issues, mismatches, and fixes needed.

## Project Overview

**Name:** Rewards Platform
**Type:** Full-stack rewards/loyalty platform with Express.js API backend and Next.js dashboard
**Stack:** TypeScript, Express.js, Next.js 15, Prisma ORM, PostgreSQL, Clerk Auth
**Deployment:** Railway (primary), Azure (configured), Docker-ready

---

## Quick Start

```bash
# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Start development (API on port 8080, Dashboard on port 3001)
npm run dev:all

# Or run separately
npm run dev        # API only
npm run dev:dashboard  # Dashboard only

# Database
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio
npm run prisma:seed       # Seed database
```

---

## Project Structure

```
rewards/
├── src/                    # Express.js API backend
│   ├── app.ts              # Express app setup & routes
│   ├── server.ts           # Server entry point (port 8080)
│   ├── controllers/        # Request handlers (9 controllers)
│   ├── routes/             # Route definitions (13 route files)
│   ├── middleware/         # Auth, validation, rate limiting
│   ├── services/           # Business logic (rewards engine, fraud detection)
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utilities (Prisma client, env validation)
├── dashboard/              # Next.js 15 dashboard (port 3001)
│   ├── app/                # App Router pages
│   ├── components/         # React components
│   └── lib/                # Dashboard utilities
├── prisma/                 # Database schema & migrations
├── infra/                  # Infrastructure (Azure Bicep)
├── scripts/                # Utility scripts
└── .github/workflows/      # CI/CD
```

---

## Critical Issues Requiring Immediate Attention

### 1. Security: Unprotected Dev Routes in Production Code

**Location:** `src/app.ts:292-332`

```typescript
// ✅ HARD DEV BYPASS: direct brand access with ZERO auth or middleware
app.get("/__dev/brands", async (_req, res) => {
  const brands = await prisma.brand.findMany();
  res.json(brands);
});
```

**Risk:** These routes expose database data without ANY authentication in ALL environments.

**Fix:** Add environment check or remove entirely:
```typescript
if (process.env.NODE_ENV === "development") {
  app.get("/__dev/brands", ...);
}
```

### 2. Security: Dev Auth Bypass

**Location:** `src/middleware/auth.ts:24-63`

The authentication middleware completely bypasses Clerk auth when `NODE_ENV === "development"`, creating a fake user with admin privileges.

**Risk:** If accidentally deployed with wrong NODE_ENV, all routes are unprotected.

**Recommendation:**
- Ensure Railway/production sets `NODE_ENV=production` (currently configured correctly)
- Consider adding explicit production-only safeguard

### 3. Security: SMOKE_TEST_BYPASS Environment Variable

**Location:** `src/app.ts:47-53`

When `SMOKE_TEST_BYPASS=true`, test routes bypass authentication.

**Risk:** If set in production, allows unauthenticated access to test endpoints.

**Recommendation:** Ensure this is NEVER set in production environment variables.

### 4. Missing Error Handler Integration

**Location:** `src/middleware/errorHandler.ts` exists but is not registered in `src/app.ts`

**Impact:** Global error handling middleware is defined but never used.

**Fix:** Add to app.ts:
```typescript
import { errorHandler } from "./middleware/errorHandler";
// ... at the end of route definitions
app.use(errorHandler);
```

---

## Code Quality Issues

### ESLint Errors (57 errors, 35 warnings)

Run `npm run lint` to see all issues. Key categories:

1. **Prettier formatting issues** (49 auto-fixable)
   - Run `npm run lint:fix` to auto-fix

2. **Unused variables** (3 errors)
   - `src/server.ts:2` - `env` imported but never used
   - `src/routes/integrationRoutes.ts:569` - `event` assigned but never used
   - `src/services/fraudDetection.ts:3` - `rewardsEngine` imported but never used

3. **`any` type usage** (35 warnings)
   - Multiple files use `any` instead of proper types
   - Consider creating proper interfaces in `src/types/`

4. **Namespace usage** (1 error)
   - `src/types/index.ts:36` - Uses deprecated namespace, prefer ES modules

### Dashboard Lint Warnings

Run `cd dashboard && npm run lint` - 31 `@typescript-eslint/no-explicit-any` warnings.

---

## Dependency Issues

### Unnecessary Dependencies

**API package.json:**
- `@clerk/nextjs` - Not needed for Express backend (only `@clerk/backend` and `@clerk/express` are used)

**Fix:** Remove from API package.json:
```bash
npm uninstall @clerk/nextjs
```

### Deprecated Dependencies

Both API and Dashboard use deprecated packages:
- `eslint@8.x` - Deprecated, update to ESLint 9
- `glob@7.x` - Deprecated, update to v9+
- `rimraf@3.x` - Deprecated, update to v4+
- `inflight` - Memory leak, remove if possible

### Version Mismatches

| Package | API Version | Dashboard Version |
|---------|-------------|-------------------|
| @clerk/nextjs | ^6.36.0 | ^6.36.2 |
| zod | ^3.22.4 | ^3.23.0 |
| typescript | ^5.3.3 | ^5.5.0 |

**Recommendation:** Align versions across packages.

---

## Configuration Issues

### 1. Duplicate ESLint Config

**Files:** `.eslintrc.json` and `.eslintrc.json.bak` are identical.

**Fix:** Delete the backup file:
```bash
rm .eslintrc.json.bak
```

### 2. Incomplete .env.example

**Missing variables:**
- `CLERK_SECRET_KEY` - Required for production auth
- `CLERK_PUBLISHABLE_KEY` - Required for Clerk
- `NODE_ENV` - Important for auth behavior
- `SMOKE_TEST_BYPASS` - Should be documented (as DO NOT SET IN PRODUCTION)

**Recommended .env.example:**
```env
PORT=8080
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rewards
NODE_ENV=development

# Clerk Authentication (required for production)
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=

# Storage (optional)
STORAGE_PROVIDER=cloud
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=
STORAGE_REGION=

# Testing only - NEVER set in production
# SMOKE_TEST_BYPASS=true
# DEV_AUTH_USER_ID=
```

### 3. Docker Compose Hardcoded Credentials

**Location:** `docker-compose.yml:21-22`

```yaml
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
```

**Note:** Acceptable for local development, but ensure these don't leak to production.

---

## TODO Items in Codebase

| Location | TODO |
|----------|------|
| `src/middleware/auth.ts:381` | "TODO: Later tighten this to real role checks, but MVP should not block" |
| `src/middleware/auth.ts:393` | "TODO: Add platform admin or brand owner checks here later" |
| `src/routes/index.ts:40` | "TODO: Remove after smoke test verification" |

---

## Build & Deployment

### Build Status

- **TypeScript Build:** ✅ Passes (`npm run build`)
- **API Lint:** ❌ 57 errors, 35 warnings (`npm run lint`)
- **Dashboard Type Check:** ✅ Passes (`cd dashboard && npm run type-check`)
- **Dashboard Lint:** ⚠️ 31 warnings (`cd dashboard && npm run lint`)
- **Security Vulnerabilities:** ✅ 0 found (`npm audit`)

### Deployment Platforms

1. **Railway** (Primary)
   - Config: `railway.json`
   - Uses NIXPACKS builder
   - Docs: `RAILWAY_DEPLOYMENT.md`

2. **Azure** (Configured, not active)
   - Workflow: `.github/workflows/azure-deploy.yml`
   - Template: `infra/azure/main.bicep`
   - Docs: `AZURE_MIGRATION.md`

3. **Docker**
   - Dockerfile with multi-stage build
   - docker-compose for local development

---

## API Architecture

### Authentication Layers

1. **Clerk Auth** (Production) - JWT verification via `@clerk/backend`
2. **Dev Bypass** (Development) - Auto-creates dev user when NODE_ENV=development
3. **API Key Auth** - For integration routes (`/api/integration/*`)
4. **Smoke Test Bypass** - For `/api/__test/*` routes when SMOKE_TEST_BYPASS=true

### Key Routes

| Route | Auth | Purpose |
|-------|------|---------|
| `/health` | None | Health check |
| `/api/brands/*` | Clerk | Brand management |
| `/api/portal/*` | Clerk | Portal operations |
| `/api/integration/*` | API Key | External integrations |
| `/api/__test/*` | SMOKE_TEST_BYPASS | Testing only |
| `/__dev/*` | **NONE** | ⚠️ Debug routes (security risk) |

### Database Models

- User, Brand, BrandMember, Campaign
- RewardLedger (mint/burn points)
- Redemption, FraudFlag
- WebhookEvent, WebhookSubscription
- BrandApiKey, IntegrationEvent

---

## Recommended Fixes Priority

### High Priority (Security)

1. [ ] Gate `/__dev/*` routes behind NODE_ENV check
2. [ ] Verify SMOKE_TEST_BYPASS is not set in production
3. [ ] Integrate errorHandler middleware

### Medium Priority (Code Quality)

4. [ ] Run `npm run lint:fix` to fix 49 auto-fixable issues
5. [ ] Remove unused imports (server.ts, fraudDetection.ts, integrationRoutes.ts)
6. [ ] Delete `.eslintrc.json.bak`
7. [ ] Remove `@clerk/nextjs` from API package.json

### Low Priority (Maintenance)

8. [ ] Update deprecated dependencies (eslint, glob, rimraf)
9. [ ] Align dependency versions between API and Dashboard
10. [ ] Complete .env.example documentation
11. [ ] Address TODO comments in auth middleware
12. [ ] Replace `any` types with proper interfaces

---

## Useful Commands

```bash
# Development
npm run dev:all          # Run API + Dashboard
npm run prisma:studio    # Database GUI

# Code Quality
npm run lint:fix         # Auto-fix lint issues
npm run format           # Format code with Prettier

# Testing
npm run smoke:mvp        # Run smoke tests

# Database
npm run prisma:migrate   # Create/run migrations
npm run prisma:seed      # Seed database

# Build
npm run build            # Compile TypeScript
docker-compose up        # Run with Docker
```

---

## Documentation

- `README.md` - Project overview
- `DEPLOYMENT.md` - Production deployment guide
- `INTEGRATION.md` - Integration guide (26KB)
- `API_OVERVIEW.md` - API documentation (29KB)
- `AUTH_FIX.md` - Authentication system details
- `CLERK_TOKEN_GUIDE.md` - Clerk token usage
- `RAILWAY_DEPLOYMENT.md` - Railway-specific guide
- `JOURNAL.md` - Development changelog (33KB)
