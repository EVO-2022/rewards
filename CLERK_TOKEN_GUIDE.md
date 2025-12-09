# How to Get Clerk API Token for Testing

## Understanding Clerk Token Types

Clerk uses different token types:
- **Dashboard Token**: For accessing Clerk dashboard (what you have)
- **Session Token**: For authenticating API requests (what you need)
- **Secret Key**: For server-side Clerk API calls

## Method 1: Get Session Token from Frontend (Recommended)

If you have a frontend app with Clerk:

1. **Log into your application** (not Clerk dashboard)
2. **Open browser DevTools** (F12)
3. **Go to Application/Storage tab**
4. **Look for Clerk session cookie**:
   - Cookie name: `__session` or `__clerk_db_jwt`
   - Or check Local Storage for Clerk session data
5. **Copy the session token value**

## Method 2: Create Test User via Clerk API

Use Clerk's Backend API to create a test user and get their session token:

```bash
# 1. Get your Clerk Secret Key from Dashboard
# Dashboard → API Keys → Secret Key

# 2. Create a test user
curl -X POST https://api.clerk.com/v1/users \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email_address": ["test@example.com"],
    "password": "TestPassword123!",
    "skip_password_checks": false
  }'

# 3. Create a session for that user
curl -X POST https://api.clerk.com/v1/users/{user_id}/sessions \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY" \
  -H "Content-Type: application/json"

# This returns a session token you can use
```

## Method 3: Use Clerk Backend SDK to Generate Token

Create a simple script to generate a test token:

```typescript
// scripts/generate-clerk-token.ts
import { clerkClient } from '@clerk/clerk-sdk-node';

async function generateTestToken() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  
  // Create or get test user
  const users = await clerkClient.users.getUserList({
    emailAddress: ['test@example.com'],
  });
  
  let userId;
  if (users.length === 0) {
    // Create test user
    const user = await clerkClient.users.createUser({
      emailAddress: ['test@example.com'],
      password: 'TestPassword123!',
    });
    userId = user.id;
  } else {
    userId = users[0].id;
  }
  
  // Create session
  const session = await clerkClient.sessions.createSession({
    userId: userId,
  });
  
  console.log('Session Token:', session.lastActiveToken);
}

generateTestToken();
```

## Method 4: Quick Test - Use Clerk Dashboard to Create User

1. Go to **Clerk Dashboard** → **Users**
2. Click **"Create User"**
3. Enter email and password
4. After creation, you can:
   - Use Clerk's "Sign in as user" feature to get their session
   - Or use the Backend API to create a session for that user

## For Your Smoke Test

Once you have a valid session token:

```bash
API_URL='https://rewards-production-a600.up.railway.app/api' \
ADMIN_TEST_TOKEN='your-session-token-here' \
npm run smoke:mvp
```

## Alternative: Test Locally First

Since local dev bypasses auth, test locally first:

```bash
# Terminal 1
npm run dev

# Terminal 2  
API_URL='http://localhost:3000/api' npm run smoke:mvp
```

## Finding Your Clerk Secret Key

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to **API Keys** in the sidebar
4. Copy the **Secret Key** (starts with `sk_test_` or `sk_live_`)

**Note**: Secret Key is for server-side operations. For API requests, you need a user session token.

