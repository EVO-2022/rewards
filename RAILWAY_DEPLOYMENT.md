# Railway API Deployment - Step 1 Checklist

## Prerequisites
- [ ] Railway account created
- [ ] GitHub repository connected to Railway
- [ ] PostgreSQL service added to Railway project
- [ ] Clerk account with production keys ready

---

## Step 1: Set Environment Variables in Railway

Go to your Railway project → Variables tab and set:

### Required Variables:
```
NODE_ENV=production
CLERK_SECRET_KEY=sk_live_... (or sk_test_...)
CLERK_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
```

**Note:** `DATABASE_URL` is automatically set by Railway PostgreSQL service - DO NOT set it manually.

### Optional Variables (can use defaults):
```
PORT=8080 (Railway sets this automatically)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### DO NOT SET (Production):
- `DEV_AUTH_USER_ID` - Dev only
- `SMOKE_TEST_BYPASS` - Test only

---

## Step 2: Deploy Service

1. Railway will automatically:
   - Detect Node.js project
   - Run `npm install`
   - Run `npm run build`
   - Run `npm start` (which runs `prisma migrate deploy && node dist/server.js`)

2. Wait for deployment to complete (check Railway logs)

---

## Step 3: Verify Migrations

After deployment, check Railway logs for:
```
Applying migration `20251208075150_init`
Applying migration `20251210235128_add_brand_api_key`
Applying migration `20251211203846_add_integration_event`

All migrations have been successfully applied.
```

If migrations didn't run automatically, run manually:
```bash
railway run npm run prisma:migrate:deploy
```

---

## Step 4: Test Health Endpoint

Get your Railway service URL (e.g., `https://rewards-production-a600.up.railway.app`)

Test health endpoint:
```bash
curl https://your-service.railway.app/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-01-18T..."}
```

---

## Step 5: Verify Production Auth

Test that protected routes require auth:
```bash
# Should return 401
curl https://your-service.railway.app/api/brands

# Should return 200
curl https://your-service.railway.app/health
```

---

## After Step 1 Complete - Report Back:

1. **Railway Service URL:** `https://...`
2. **Health Response:** `{"status":"ok","timestamp":"..."}`
3. **Migrations Status:** "All 3 migrations applied successfully"

Then proceed to Step 2 (Vercel Dashboard deployment).
