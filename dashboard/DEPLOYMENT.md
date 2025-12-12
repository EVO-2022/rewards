# Deployment Guide

## Required Environment Variables

### Clerk Authentication
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key for frontend
- `CLERK_SECRET_KEY` - Clerk secret key for backend (server-side only)

### Rewards API
- `NEXT_PUBLIC_REWARDS_API_URL` - Base URL for the Rewards API backend
  - Example: `https://rewards-production.up.railway.app/api`
  - Default (development): `http://localhost:3000/api`

### Optional
- `NEXT_PUBLIC_BRAND_ID` - Fallback brand ID for development/testing
- `DEBUG_REWARDS=1` - Enable debug logging (set to "1" to enable)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_REWARDS_API_URL=http://localhost:3000/api
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The dashboard will be available at `http://localhost:3001`

## Build and Start

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

   The production server runs on port 3001 by default.

## Notes

### Clerk Configuration
- The dashboard uses Clerk for authentication
- All admin API calls require a valid Clerk session token
- Server-side API calls automatically attach the Clerk JWT token

### Rewards API Base URL
- Must point to the Rewards API backend
- Should include the `/api` path if your backend serves API routes under that prefix
- For production, use the full HTTPS URL

### Server-Only Code
- Files in `lib/server/` are server-only and cannot be imported in client components
- Client components should use Next.js API routes in `app/api/` for server-side operations

### Debug Logging
- Set `DEBUG_REWARDS=1` to enable detailed debug logging
- Debug logs are suppressed in production by default
- Useful for troubleshooting API calls and data fetching

## Production Deployment

1. Ensure all environment variables are set in your deployment platform
2. Run `npm run build` to verify the build succeeds
3. Deploy the `.next` directory and `package.json`
4. Run `npm start` or use your platform's start command

## Troubleshooting

### "Route used ...headers()" errors
- Ensure all pages using `auth()` have `export const dynamic = "force-dynamic"`
- Never import server-only modules (`lib/server/*`) in client components

### API calls failing
- Verify `NEXT_PUBLIC_REWARDS_API_URL` is set correctly
- Check that Clerk authentication is working
- Enable `DEBUG_REWARDS=1` to see detailed API call logs

### Build errors
- Ensure `outputFileTracingRoot` is set in `next.config.mjs`
- Check for any client components importing server-only code

