# Authentication Fix - December 2024

## Problem
Authentication was completely broken:
- **Development mode**: Auth was bypassed (intentional, but too broad)
- **Production mode**: Multiple bypasses (`SMOKE_TEST_BYPASS`) disabled ALL authentication
- **No error logging**: Couldn't debug why auth was failing
- **Result**: Either no one could login OR anyone could login (depending on env vars)

## Solution

### 1. Fixed Authentication Middleware (`src/middleware/auth.ts`)

**Before:**
- Global auth kill switch disabled ALL auth when `SMOKE_TEST_BYPASS=true`
- No error logging
- No validation of Clerk configuration

**After:**
- **Development mode**: Auth bypassed (for local dev only)
- **Production mode**: Proper Clerk authentication with error handling
- **Test routes**: Only `/api/__test/*` routes bypass auth when `SMOKE_TEST_BYPASS=true`
- **Comprehensive logging**: All auth attempts and failures are logged
- **Error messages**: Clear error messages explaining what went wrong

### 2. Fixed Global Auth Application (`src/app.ts`)

**Before:**
- Global auth kill switch disabled auth for ALL routes
- Test route bypass was too broad

**After:**
- Auth applies to all routes EXCEPT:
  - `/health` (health check)
  - `/api/__test/*` and `/__test/*` (only when `SMOKE_TEST_BYPASS=true`)
- `syncUser` middleware runs after auth to sync Clerk users to database

### 3. Enhanced User Sync (`syncUser` middleware)

**Improvements:**
- Better logging of user sync process
- Handles Clerk user creation if user doesn't exist in database
- Converts Clerk ID to database user ID for controllers
- Clear error messages if sync fails

## How Authentication Works Now

### Development Mode (`NODE_ENV=development`)
1. Auth is bypassed - fake dev user is injected
2. No Clerk tokens required
3. All routes accessible without authentication

### Production Mode (`NODE_ENV=production`)
1. **All routes require authentication** (except health check)
2. Client must send: `Authorization: Bearer <clerk-session-token>`
3. Clerk validates the token
4. User is synced to database (created if doesn't exist)
5. `req.auth.userId` is set to database user ID for controllers

### Test Routes (for smoke testing)
- Only accessible when `SMOKE_TEST_BYPASS=true`
- Only routes starting with `/api/__test` or `/__test` bypass auth
- All other routes still require authentication

## Environment Variables

### Required for Production:
```env
NODE_ENV=production
CLERK_SECRET_KEY=sk_live_...  # Required for auth to work
CLERK_PUBLISHABLE_KEY=pk_live_...  # Required for auth to work
DATABASE_URL=postgresql://...
```

### Optional (for smoke testing):
```env
SMOKE_TEST_BYPASS=true  # Only bypasses /api/__test routes
```

## Error Messages

The auth middleware now provides clear error messages:

1. **Missing Clerk Secret Key:**
   ```json
   {
     "error": "Authentication not configured",
     "details": "CLERK_SECRET_KEY environment variable is missing"
   }
   ```

2. **Invalid/Missing Token:**
   ```json
   {
     "error": "Unauthorized",
     "details": "Invalid or missing authentication token",
     "hint": "Ensure you're sending a valid Clerk session token in the Authorization header as: Authorization: Bearer <token>"
   }
   ```

## Logging

All authentication attempts are logged:

- **Auth attempt**: Logs path, method, and whether auth header is present
- **Auth success**: Logs authenticated user ID
- **Auth failure**: Logs error details, path, and auth header prefix
- **User sync**: Logs when users are created or found in database

## Testing

### Test with Real Clerk Token:
```bash
curl -X GET https://your-api.com/api/brands \
  -H "Authorization: Bearer <clerk-session-token>"
```

### Test Routes (smoke testing):
```bash
# Set SMOKE_TEST_BYPASS=true in environment
curl -X POST https://your-api.com/api/__test/create-brand \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Brand", "slug": "test-brand"}'
```

## Next Steps

1. **Remove smoke test bypasses** once smoke tests pass
2. **Test with real Clerk tokens** from your frontend
3. **Monitor logs** to see authentication flow
4. **Verify** that unauthorized requests are properly rejected

## Files Modified

- `src/middleware/auth.ts` - Fixed authentication logic
- `src/app.ts` - Fixed global auth application and added syncUser
- All routes now properly protected (except test routes when bypass enabled)

