# Production Deployment Guide

This document provides complete deployment instructions for both the Rewards API (Railway) and Dashboard (Vercel).

---

## 🚂 Railway Deployment (API Backend)

### Required Environment Variables

**Required:**
- `NODE_ENV=production` - **CRITICAL**: Enables Clerk authentication enforcement
- `DATABASE_URL` - PostgreSQL connection string (auto-set by Railway PostgreSQL service)
- `CLERK_SECRET_KEY` - Clerk secret key (from Clerk dashboard, starts with `sk_live_` or `sk_test_`)
- `CLERK_PUBLISHABLE_KEY` - Clerk publishable key (from Clerk dashboard, starts with `pk_live_` or `pk_test_`)

**Optional:**
- `PORT` - Server port (Railway sets this automatically, default: 8080)
- `JWT_SECRET` - JWT signing secret (optional, for future use)
- `RATE_LIMIT_WINDOW_MS=900000` - Rate limit window in milliseconds (default: 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS=100` - Max requests per window (default: 100)

**Development Only (DO NOT SET IN PRODUCTION):**
- `DEV_AUTH_USER_ID` - Dev-only user ID override (only for local development)
- `SMOKE_TEST_BYPASS` - Test route bypass (only for automated testing)

### Deployment Steps

1. **Create Railway Project**
   - Sign up at [railway.app](https://railway.app)
   - Create new project
   - Connect GitHub repository: `https://github.com/EVO-2022/rewards`

2. **Add PostgreSQL Service**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway automatically creates `DATABASE_URL` environment variable

3. **Configure Environment Variables**
   - Set all required variables listed above
   - **IMPORTANT**: Ensure `NODE_ENV=production` is set

4. **Deploy**
   - Railway automatically detects Node.js project
   - Runs: `npm install` → `npm run build` → `npm start`
   - The `start` script runs: `prisma migrate deploy && node dist/server.js`

5. **Verify Deployment**
   - Check health endpoint: `https://your-app.railway.app/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

6. **Run Migrations** (if not auto-run)
   ```bash
   railway run npm run prisma:migrate deploy
   ```

7. **Update Clerk Settings**
   - In Clerk dashboard, add Railway domain to allowed origins
   - Update webhook URLs if needed

### Authentication Behavior

**Production Mode (`NODE_ENV=production`):**
- ✅ All routes require Clerk authentication (except `/health`)
- ✅ Integration routes (`/api/integration/*`) use API key auth
- ✅ Test routes (`/api/__test/*`) are disabled unless `SMOKE_TEST_BYPASS=true`
- ❌ No dev auth bypass - all requests must include valid Clerk JWT token

**Request Format:**
```
Authorization: Bearer <clerk-session-token>
```

---

## ▲ Vercel Deployment (Dashboard)

### Required Environment Variables

**Required:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (from Clerk dashboard)
- `CLERK_SECRET_KEY` - Clerk secret key (from Clerk dashboard, server-side only)
- `NEXT_PUBLIC_REWARDS_API_URL` - Full URL to Railway API (e.g., `https://rewards-production-a600.up.railway.app/api`)

**Optional:**
- `NEXT_PUBLIC_BRAND_ID` - Fallback brand ID for development/testing
- `DEBUG_REWARDS=1` - Enable debug logging (set to "1" to enable, leave unset for production)

### Deployment Steps

1. **Create Vercel Project**
   - Sign up at [vercel.com](https://vercel.com)
   - Import GitHub repository: `https://github.com/EVO-2022/rewards`
   - Set root directory to: `dashboard`

2. **Configure Environment Variables**
   - Add all required variables listed above
   - **IMPORTANT**: `NEXT_PUBLIC_*` variables are exposed to the browser

3. **Build Settings**
   - Framework Preset: Next.js
   - Root Directory: `dashboard`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

4. **Deploy**
   - Vercel automatically detects Next.js
   - Runs build and deployment
   - Dashboard available at: `https://your-app.vercel.app`

5. **Update Clerk Settings**
   - In Clerk dashboard, add Vercel domain to allowed origins
   - Configure redirect URLs for sign-in/sign-up

### Environment Variable Notes

- **`NEXT_PUBLIC_*` variables** are exposed to the browser - never put secrets here
- **`CLERK_SECRET_KEY`** is server-only and safe to use in API routes
- **`NEXT_PUBLIC_REWARDS_API_URL`** must include `/api` path if your backend serves routes under that prefix

---

## 🔐 Authentication Verification

### Production Auth Enforcement

**Test 1: Protected Route Without Token (Should Fail)**
```bash
curl -X GET https://your-api.railway.app/api/brands
# Expected: 401 Unauthorized
# Response: {"error":"Unauthorized","details":"Missing or invalid authentication token"}
```

**Test 2: Health Check Without Token (Should Pass)**
```bash
curl -X GET https://your-api.railway.app/health
# Expected: 200 OK
# Response: {"status":"ok","timestamp":"2026-01-18T18:40:29.397Z"}
```

**Test 3: Protected Route With Valid Token (Should Pass)**
```bash
curl -X GET https://your-api.railway.app/api/brands \
  -H "Authorization: Bearer <clerk-session-token>"
# Expected: 200 OK
# Response: Array of brands
```

### Auth Behavior Summary

| Route | Production Auth | Dev Auth |
|-------|---------------|----------|
| `/health` | ❌ No auth required | ❌ No auth required |
| `/api/integration/*` | 🔑 API key auth | ❌ No auth (dev mode) |
| `/api/__test/*` | ❌ Disabled (unless `SMOKE_TEST_BYPASS=true`) | ❌ No auth (dev mode) |
| All other routes | ✅ Clerk JWT required | ❌ No auth (dev mode) |

---

## 📊 Database Migrations

### Migration Status

**Total Migrations:** 3

1. **`20251208075150_init`** - Initial schema
   - Creates all core models: User, Brand, BrandMember, Campaign, RewardLedger, Redemption, FraudFlag, WebhookEvent

2. **`20251210235128_add_brand_api_key`** - Brand API keys
   - Adds BrandApiKey model for integration authentication

3. **`20251211203846_add_integration_event`** - Integration events
   - Adds IntegrationEvent model for tracking integration activity

### Running Migrations

**Production (Railway):**
```bash
railway run npm run prisma:migrate deploy
```

**Local:**
```bash
npm run prisma:migrate deploy
```

**Verify No Drift:**
```bash
# Run against clean database
DATABASE_URL="postgresql://user:pass@host:5432/db" npx prisma migrate deploy
# Expected: "All migrations have been successfully applied."
```

### Migration Verification Results

✅ **All migrations applied successfully against clean database**
- No drift detected
- All 3 migrations applied in order
- Database schema matches Prisma schema

---

## 🚨 Important Production Notes

### Security

1. **Never set `NODE_ENV=development` in production** - This disables all authentication
2. **Never set `DEV_AUTH_USER_ID` in production** - This is dev-only
3. **Never set `SMOKE_TEST_BYPASS=true` in production** - This exposes test routes
4. **Always use HTTPS** - Railway and Vercel provide this automatically

### Monitoring

- Check Railway logs for startup messages
- Verify `NODE_ENV=production` is set (check startup logs)
- Monitor Clerk authentication errors in logs
- Check database connection health

### Troubleshooting

**401 Unauthorized on all routes:**
- Verify `NODE_ENV=production` is set
- Check `CLERK_SECRET_KEY` is correct
- Verify Clerk token is valid and not expired

**Database connection errors:**
- Verify `DATABASE_URL` is set correctly
- Check Railway PostgreSQL service is running
- Verify network connectivity

**Migration errors:**
- Check database permissions
- Verify `DATABASE_URL` format is correct
- Run `prisma migrate status` to check migration state

---

## 📝 Quick Reference

### Railway Environment Variables (Complete List)
```
NODE_ENV=production
DATABASE_URL=<auto-set-by-railway>
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
PORT=8080
JWT_SECRET=<optional>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Vercel Environment Variables (Complete List)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_REWARDS_API_URL=https://your-api.railway.app/api
DEBUG_REWARDS=<optional>
NEXT_PUBLIC_BRAND_ID=<optional>
```

---

**Last Updated:** 2026-01-18  
**Status:** Production Ready ✅
