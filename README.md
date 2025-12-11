# Rewards Platform API

A full-featured Web2 rewards platform backend with a Web3 ledger foundation, built with Node.js, TypeScript, Express, PostgreSQL, and Prisma.

## Features

- **Multi-tenant Brand System**: Support for multiple brands with isolated point systems
- **Role-Based Access Control**: OWNER, MANAGER, and VIEWER roles per brand
- **Webhook Ingestion**: Provider-agnostic webhook intake for Shopify and Stripe
- **Rewards Engine**: Offchain simulation of ERC-20 mint/burn operations
- **Fraud Detection**: Velocity checks, large amount detection, and flagging system
- **Campaign Management**: Create and manage reward campaigns
- **Redemption System**: Points redemption with balance validation
- **Admin System**: Platform admin controls for suspending users and brands
- **Clerk Authentication**: Email, Google, and phone authentication support

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Clerk
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Zod

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Clerk account (for authentication)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
cd /Users/dippo/Documents/GitHub/rewards
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rewards?schema=public"

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Security
JWT_SECRET=your-secret-key-here
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Set Up PostgreSQL Database

```bash
# Create database
createdb rewards

# Or using psql
psql -U postgres
CREATE DATABASE rewards;
```

### 4. Configure Clerk

1. Sign up at [clerk.com](https://clerk.com)
2. Create a new application
3. Copy your Publishable Key and Secret Key
4. Add them to your `.env` file
5. Configure authentication methods (Email, Google, Phone) in Clerk dashboard

### 5. Run Database Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with demo data
npm run prisma:seed
```

### 6. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Authentication
All protected routes require Clerk authentication. Include the Clerk session token in the `Authorization` header.

### Brands
- `POST /api/brands` - Create a brand (requires auth)
- `GET /api/brands` - List user's brands (requires auth)
- `GET /api/brands/:brandId` - Get brand details (requires brand access)
- `PATCH /api/brands/:brandId` - Update brand (requires OWNER role)
- `DELETE /api/brands/:brandId` - Delete brand (requires OWNER role)

### Team Members
- `POST /api/brands/:brandId/members` - Add team member (requires MANAGER+)
- `GET /api/brands/:brandId/members` - List team members (requires MANAGER+)
- `PATCH /api/brands/:brandId/members/:memberId` - Update member role (requires MANAGER+)
- `DELETE /api/brands/:brandId/members/:memberId` - Remove member (requires MANAGER+)

### Campaigns
- `POST /api/brands/:brandId/campaigns` - Create campaign (requires MANAGER+)
- `GET /api/brands/:brandId/campaigns` - List campaigns (requires brand access)
- `GET /api/brands/:brandId/campaigns/:campaignId` - Get campaign (requires brand access)
- `PATCH /api/brands/:brandId/campaigns/:campaignId` - Update campaign (requires MANAGER+)
- `DELETE /api/brands/:brandId/campaigns/:campaignId` - Delete campaign (requires MANAGER+)

### Points
- `POST /api/brands/:brandId/points/issue` - Issue points (requires MANAGER+)
- `POST /api/brands/:brandId/points/burn` - Burn points (requires MANAGER+)
- `GET /api/brands/:brandId/points/balance/:userId` - Get user balance (requires brand access)
- `GET /api/brands/:brandId/points/ledger/:userId` - Get ledger history (requires brand access)

### Redemptions
- `POST /api/brands/:brandId/redemptions` - Create redemption (requires brand access)
- `GET /api/brands/:brandId/redemptions` - List redemptions (requires brand access)
- `GET /api/brands/:brandId/redemptions/:redemptionId` - Get redemption (requires brand access)
- `PATCH /api/brands/:brandId/redemptions/:redemptionId/cancel` - Cancel redemption (requires brand access)

### Fraud Management
- `GET /api/brands/:brandId/fraud` - List fraud flags (requires MANAGER+)
- `GET /api/brands/:brandId/fraud/:flagId` - Get fraud flag (requires MANAGER+)
- `PATCH /api/brands/:brandId/fraud/:flagId/review` - Review fraud flag (requires MANAGER+)

### Webhooks
- `POST /api/webhooks/ingest` - Ingest webhook (rate limited, no auth)

### Admin
- `GET /api/admin/users` - List all users (requires platform admin)
- `PATCH /api/admin/users/:userId/suspend` - Suspend user (requires platform admin)
- `GET /api/admin/brands` - List all brands (requires platform admin)
- `PATCH /api/admin/brands/:brandId/suspend` - Suspend brand (requires platform admin)

## Webhook Ingestion

The webhook ingestion endpoint accepts a normalized format:

```json
{
  "source": "shopify" | "stripe",
  "event": "checkout.completed",
  "user": {
    "email": "user@example.com",
    "phone": "+1234567890"
  },
  "order": {
    "id": "order_123",
    "total": 100.50,
    "currency": "USD"
  },
  "metadata": {
    "raw_payload": { /* original webhook payload */ }
  }
}
```

### Testing Webhooks

#### Shopify Example

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "shopify",
    "event": "checkout.completed",
    "user": {
      "email": "customer@example.com"
    },
    "order": {
      "id": "shopify_order_123",
      "total": 99.99,
      "currency": "USD"
    },
    "metadata": {
      "raw_payload": {
        "id": 123456,
        "total_price": "99.99",
        "currency": "USD"
      }
    }
  }'
```

#### Stripe Example

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": "stripe",
    "event": "payment_intent.succeeded",
    "user": {
      "email": "customer@example.com"
    },
    "order": {
      "id": "pi_1234567890",
      "total": 149.99,
      "currency": "USD"
    },
    "metadata": {
      "raw_payload": {
        "id": "evt_1234567890",
        "type": "payment_intent.succeeded",
        "data": {
          "object": {
            "amount": 14999,
            "currency": "usd"
          }
        }
      }
    }
  }'
```

## Database Schema

### Core Models

- **User**: Linked to Clerk, supports email/phone
- **Brand**: Multi-tenant brand/organization
- **BrandMember**: User-brand relationship with roles
- **Campaign**: Reward campaigns with points per dollar
- **RewardLedger**: Mint/burn transaction log (simulates ERC-20)
- **Redemption**: Points redemption records
- **FraudFlag**: Fraud detection flags
- **WebhookEvent**: Raw webhook payload storage

## Deployment to Railway

### 1. Prepare for Deployment

Ensure your code is committed to a Git repository.

### 2. Create Railway Project

1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository

### 3. Add PostgreSQL Service

1. Click "New" → "Database" → "PostgreSQL"
2. Railway will automatically create a `DATABASE_URL` environment variable

### 4. Configure Environment Variables

Add the following environment variables in Railway:

- `NODE_ENV=production`
- `DATABASE_URL` (automatically set by PostgreSQL service)
- `CLERK_PUBLISHABLE_KEY` (from Clerk dashboard)
- `CLERK_SECRET_KEY` (from Clerk dashboard)
- `JWT_SECRET` (generate a secure random string)
- `RATE_LIMIT_WINDOW_MS=900000`
- `RATE_LIMIT_MAX_REQUESTS=100`
- `PORT` (Railway sets this automatically, but you can override)

### 5. Deploy

Railway will automatically:
1. Detect the Node.js project
2. Run `npm install`
3. Run `npm run build`
4. Run `npm start`

### 6. Run Migrations

After deployment, run migrations:

```bash
# Connect to Railway CLI or use Railway dashboard
railway run npm run prisma:migrate deploy
railway run npm run prisma:seed
```

Or use Railway's web terminal to run:
```bash
npm run prisma:migrate deploy
npm run prisma:seed
```

### 7. Update Clerk Settings

In your Clerk dashboard:
1. Add your Railway domain to allowed origins
2. Update webhook URLs if needed

## Development Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with demo data
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## Project Structure

```
rewards/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seed script
├── src/
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── .env                   # Environment variables (not in git)
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevents abuse on webhook and API endpoints
- **Input Validation**: Zod schema validation on all inputs
- **Authentication**: Clerk-based authentication middleware
- **Role-Based Access**: Brand-level and platform-level roles
- **Fraud Detection**: Velocity checks and suspicious activity flagging

## Billing (Stub Implementation)

The database includes fields for Stripe billing integration:
- `stripeCustomerId` on Brand model
- `stripeSubscriptionId` on Brand model
- `billingEmail` on Brand model

Monthly billing logic is stubbed at $99/brand. Full payment integration is not implemented yet.

## Notes

- This is an API-only backend. No frontend is included.
- Blockchain contracts are not implemented yet. The rewards engine simulates ERC-20 operations offchain.
- User creation from webhooks creates temporary Clerk IDs. In production, integrate with Clerk user creation.
- Brand determination from webhooks defaults to the first active brand. In production, use webhook signatures or metadata.

## Dashboard (Admin UI)

The dashboard is a Next.js 15+ admin interface for managing brands, members, redemptions, and API keys.

### Dashboard Setup

1. **Navigate to dashboard directory:**
   ```bash
   cd dashboard
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and set:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From your Clerk dashboard
   - `CLERK_SECRET_KEY` - From your Clerk dashboard
   - `NEXT_PUBLIC_REWARDS_API_URL` - Set to `http://localhost:3000/api` for local development

4. **Start the dashboard:**
   ```bash
   npm run dev
   ```

   The dashboard will be available at `http://localhost:3001` (or next available port)

### Running Dashboard + API Locally

**Terminal 1 - Start API:**
```bash
# From repo root
npm run dev
```

**Terminal 2 - Start Dashboard:**
```bash
# From dashboard directory
cd dashboard
npm run dev
```

### Dashboard Features

- **Overview**: Brand statistics, total members, points issued/redeemed
- **Members**: List and search brand members
- **Redemptions**: View redemption history
- **API Keys**: Create and manage brand API keys for integrations

### Dashboard Pages

- `/` - Landing page with sign-in
- `/dashboard` - Overview with brand stats
- `/dashboard/members` - Member management
- `/dashboard/redemptions` - Redemption history
- `/dashboard/api-keys` - API key management

### Notes

- The dashboard uses Clerk for authentication (same as the API)
- All API calls are authenticated using Clerk JWT tokens
- For MVP, the dashboard uses the first brand from the user's brand list
- Future enhancements: brand selection, pagination, advanced filtering

## License

ISC

