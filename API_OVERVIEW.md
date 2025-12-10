# Rewards API – Overview

## Environments

- **Local base URL:** `http://localhost:3000/api`
- **Production base URL:** `https://rewards-production-a600.up.railway.app/api`

All API endpoints are prefixed with `/api` except for health check and dev/test routes.

## Authentication

- **Auth provider:** Clerk
- **Production behavior:**  
  All non-test endpoints require `Authorization: Bearer <Clerk JWT>` header. The JWT must be a valid Clerk session token.
- **Development behavior:**  
  When `NODE_ENV=development`, authentication is bypassed and a fake dev user is automatically injected. No Clerk tokens required.
- **Test-only behavior:**  
  Routes under `/api/__test/*` bypass authentication when `SMOKE_TEST_BYPASS=true` is set. These routes are for automated smoke testing only and should NOT be used by frontend applications.

### Environment Variables

- `CLERK_SECRET_KEY` - Required for production authentication
- `CLERK_PUBLISHABLE_KEY` - Required for production authentication
- `NODE_ENV` - Set to `development` for local dev, `production` for deployed environments
- `SMOKE_TEST_BYPASS` - Set to `true` to enable test route bypasses (testing only)
- `DATABASE_URL` - PostgreSQL connection string

## Core Resources

- **Brand** - A tenant/organization that manages its own rewards program. Each brand has isolated points systems and campaigns.
- **User** - Represents a user in the system. Users are synced from Clerk on first authentication.
- **BrandMember** - Membership relationship between a User and a Brand, with roles (OWNER, MANAGER, VIEWER).
- **RewardLedger** - Immutable ledger entries tracking all point mint/burn operations (MINT for issuing, BURN for redemptions).
- **Redemption** - A redemption request that burns points. Status: pending → completed.
- **Campaign** - Reward campaign configuration (points per dollar, date ranges, etc.).
- **WebhookEvent** - Ingested webhook events from external providers (Shopify, Stripe).

## Endpoints Summary

| Method | Path                                   | Auth     | Description                        |
|--------|----------------------------------------|----------|------------------------------------|
| GET    | /health                                | Public   | Health check                       |
| POST   | /api/brands                            | Required | Create a new brand + owner user    |
| GET    | /api/brands                             | Required | List brands user is member of      |
| GET    | /api/brands/:brandId                    | Required | Get brand details                  |
| PATCH  | /api/brands/:brandId                    | Required | Update brand                       |
| DELETE | /api/brands/:brandId                    | Required | Delete brand                       |
| POST   | /api/brands/:brandId/members             | Required | Add team member (MANAGER+)         |
| GET    | /api/brands/:brandId/members             | Required | Get team members                   |
| PATCH  | /api/brands/:brandId/members/:memberId  | Required | Update member role (MANAGER+)      |
| DELETE | /api/brands/:brandId/members/:memberId   | Required | Remove member (MANAGER+)          |
| POST   | /api/:brandId/points/issue              | Required | Issue points to user (MANAGER+)    |
| POST   | /api/:brandId/points/burn               | Required | Burn points (MANAGER+)          |
| GET    | /api/:brandId/points/balance/:userId    | Required | Get user balance                  |
| GET    | /api/:brandId/points/ledger/:userId     | Required | Get ledger history                |
| POST   | /api/:brandId/redemptions               | Required | Create redemption                 |
| GET    | /api/:brandId/redemptions               | Required | List redemptions                  |
| GET    | /api/:brandId/redemptions/:redemptionId | Required | Get redemption details            |
| PATCH  | /api/:brandId/redemptions/:redemptionId/cancel | Required | Cancel redemption            |
| POST   | /api/webhooks/ingest                    | Public   | Ingest webhook (rate limited)     |
| POST   | /api/__test/create-brand                | Test     | TEST-ONLY: create brand            |
| POST   | /api/__test/brands/:brandId/points/issue | Test     | TEST-ONLY: issue points            |
| GET    | /api/__test/brands/:brandId/points/balance/:userId | Test | TEST-ONLY: get balance    |
| POST   | /api/__test/brands/:brandId/redemptions | Test     | TEST-ONLY: create redemption       |

## Endpoint Details

### GET /health

**Auth:** Public (no authentication required)

**Description:**  
Health check endpoint to verify the API is running.

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-12-19T21:30:00.000Z"
}
```

**Example:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/health"
```

---

### POST /api/brands

**Auth:** Required (Clerk Bearer token in production)

**Description:**  
Creates a new brand and automatically adds the authenticated user as OWNER. The brand slug must be unique and match the pattern `[a-z0-9-]+`.

**Request body (JSON):**
```ts
{
  name: string;           // Required, min 1 character
  slug: string;          // Required, min 1 character, regex: /^[a-z0-9-]+$/
  description?: string;  // Optional
}
```

**Response (201 Created):**
```json
{
  "id": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "name": "Smoke Test Brand",
  "slug": "smoke-test-brand-1765408820837",
  "description": "Automated smoke test brand",
  "isActive": true,
  "createdAt": "2024-12-19T21:30:00.000Z",
  "updatedAt": "2024-12-19T21:30:00.000Z",
  "members": [
    {
      "id": "7e285110-4003-4ade-a7fc-04647fc9695d",
      "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
      "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
      "role": "OWNER",
      "createdAt": "2024-12-19T21:30:00.000Z",
      "user": {
        "id": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
        "email": "user@example.com",
        "phone": null
      }
    }
  ]
}
```

**Error responses:**
- `400` - Validation error (invalid slug format, missing required fields)
- `400` - Brand slug already exists
- `401` - Unauthorized (missing or invalid token)
- `500` - Internal server error

**Example:**
```bash
curl -X POST "https://rewards-production-a600.up.railway.app/api/brands" \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Brand",
    "slug": "my-brand",
    "description": "Example brand"
  }'
```

---

### GET /api/brands

**Auth:** Required

**Description:**  
Returns all brands the authenticated user is a member of.

**Response (200 OK):**
```json
[
  {
    "id": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
    "name": "My Brand",
    "slug": "my-brand",
    "description": "Example brand",
    "isActive": true,
    "createdAt": "2024-12-19T21:30:00.000Z",
    "updatedAt": "2024-12-19T21:30:00.000Z",
    "role": "OWNER"
  }
]
```

**Error responses:**
- `401` - Unauthorized
- `500` - Internal server error

---

### GET /api/brands/:brandId

**Auth:** Required

**Description:**  
Returns detailed information about a specific brand, including members and campaigns.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID

**Response (200 OK):**
```json
{
  "id": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "name": "My Brand",
  "slug": "my-brand",
  "description": "Example brand",
  "isActive": true,
  "createdAt": "2024-12-19T21:30:00.000Z",
  "updatedAt": "2024-12-19T21:30:00.000Z",
  "members": [
    {
      "id": "7e285110-4003-4ade-a7fc-04647fc9695d",
      "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
      "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
      "role": "OWNER",
      "createdAt": "2024-12-19T21:30:00.000Z",
      "user": {
        "id": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
        "email": "user@example.com",
        "phone": null
      }
    }
  ],
  "campaigns": []
}
```

**Error responses:**
- `401` - Unauthorized
- `404` - Brand not found
- `500` - Internal server error

---

### PATCH /api/brands/:brandId

**Auth:** Required

**Description:**  
Updates brand information. Only provided fields are updated.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID

**Request body (JSON):**
```ts
{
  name?: string;         // Optional, min 1 character if provided
  description?: string;  // Optional
  isActive?: boolean;    // Optional
}
```

**Response (200 OK):**
```json
{
  "id": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "name": "Updated Brand Name",
  "slug": "my-brand",
  "description": "Updated description",
  "isActive": true,
  "createdAt": "2024-12-19T21:30:00.000Z",
  "updatedAt": "2024-12-19T21:35:00.000Z"
}
```

**Error responses:**
- `400` - Validation error
- `401` - Unauthorized
- `404` - Brand not found
- `500` - Internal server error

---

### DELETE /api/brands/:brandId

**Auth:** Required

**Description:**  
Deletes a brand. This is a permanent operation.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID

**Response (204 No Content):**
Empty response body on success.

**Error responses:**
- `401` - Unauthorized
- `404` - Brand not found
- `500` - Internal server error

---

### POST /api/:brandId/points/issue

**Auth:** Required (MANAGER role or higher)

**Description:**  
Issues (mints) points to a user. Runs fraud detection checks before minting.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID

**Request body (JSON):**
```ts
{
  userId: string;        // Required, UUID
  amount: number;        // Required, positive number
  reason?: string;      // Optional
  metadata?: Record<string, any>;  // Optional, key-value pairs
}
```

**Response (201 Created):**
```json
{
  "id": "ledger-entry-id",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "amount": "100",
  "type": "MINT",
  "reason": "smoke_test_issuance",
  "metadata": {},
  "createdAt": "2024-12-19T21:30:00.000Z"
}
```

**Error responses:**
- `400` - Validation error (invalid UUID, non-positive amount)
- `401` - Unauthorized
- `403` - Insufficient permissions (not MANAGER or OWNER)
- `500` - Internal server error

**Example:**
```bash
curl -X POST "https://rewards-production-a600.up.railway.app/api/9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f/points/issue" \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
    "amount": 100,
    "reason": "manual_issue"
  }'
```

---

### GET /api/:brandId/points/balance/:userId

**Auth:** Required

**Description:**  
Gets the current point balance for a user in a specific brand.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID
- `userId` (string, UUID) - The user ID

**Response (200 OK):**
```json
{
  "balance": 100,
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f"
}
```

**Error responses:**
- `401` - Unauthorized
- `500` - Internal server error

**Example:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/api/9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f/points/balance/46d521bb-1d84-4baf-a743-f536e1f5b31d" \
  -H "Authorization: Bearer <CLERK_JWT>"
```

---

### GET /api/:brandId/points/ledger/:userId

**Auth:** Required

**Description:**  
Gets the ledger history (all mint/burn operations) for a user in a brand.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID
- `userId` (string, UUID) - The user ID

**Query parameters:**
- `limit` (number, optional) - Number of records to return (default: 50)
- `offset` (number, optional) - Number of records to skip (default: 0)

**Response (200 OK):**
```json
[
  {
    "id": "ledger-entry-id",
    "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
    "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
    "amount": "100",
    "type": "MINT",
    "reason": "smoke_test_issuance",
    "metadata": {},
    "createdAt": "2024-12-19T21:30:00.000Z"
  }
]
```

**Error responses:**
- `401` - Unauthorized
- `500` - Internal server error

---

### POST /api/:brandId/points/burn

**Auth:** Required (MANAGER role or higher)

**Description:**  
Burns (removes) points from a user. Checks for sufficient balance before burning.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID

**Request body (JSON):**
```ts
{
  userId: string;        // Required, UUID
  amount: number;        // Required, positive number
  reason?: string;      // Optional
  metadata?: Record<string, any>;  // Optional
}
```

**Response (201 Created):**
```json
{
  "id": "ledger-entry-id",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "amount": "-50",
  "type": "BURN",
  "reason": "manual_burn",
  "metadata": {},
  "createdAt": "2024-12-19T21:30:00.000Z"
}
```

**Error responses:**
- `400` - Validation error or insufficient balance
- `401` - Unauthorized
- `403` - Insufficient permissions
- `500` - Internal server error

---

### POST /api/:brandId/redemptions

**Auth:** Required

**Description:**  
Creates a redemption that burns points from a user. Automatically checks balance and updates redemption status to "completed" after burning points.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID

**Request body (JSON):**
```ts
{
  userId: string;        // Required, UUID
  pointsUsed: number;    // Required, positive number
  campaignId?: string;  // Optional, UUID
  metadata?: Record<string, any>;  // Optional
}
```

**Response (201 Created):**
```json
{
  "id": "redemption-id",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "campaignId": null,
  "pointsUsed": 50,
  "status": "completed",
  "metadata": {
    "test": true,
    "reason": "smoke_test_redemption"
  },
  "createdAt": "2024-12-19T21:30:00.000Z",
  "updatedAt": "2024-12-19T21:30:00.000Z"
}
```

**Error responses:**
- `400` - Validation error or insufficient balance
- `401` - Unauthorized
- `500` - Internal server error

**Example:**
```bash
curl -X POST "https://rewards-production-a600.up.railway.app/api/9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f/redemptions" \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
    "pointsUsed": 50,
    "metadata": {
      "reason": "reward_redemption"
    }
  }'
```

---

### GET /api/:brandId/redemptions

**Auth:** Required

**Description:**  
Lists all redemptions for a brand.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID

**Response (200 OK):**
```json
[
  {
    "id": "redemption-id",
    "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
    "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
    "campaignId": null,
    "pointsUsed": 50,
    "status": "completed",
    "metadata": {},
    "createdAt": "2024-12-19T21:30:00.000Z",
    "updatedAt": "2024-12-19T21:30:00.000Z"
  }
]
```

**Error responses:**
- `401` - Unauthorized
- `500` - Internal server error

---

### GET /api/:brandId/redemptions/:redemptionId

**Auth:** Required

**Description:**  
Gets details for a specific redemption.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID
- `redemptionId` (string, UUID) - The redemption ID

**Response (200 OK):**
```json
{
  "id": "redemption-id",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "campaignId": null,
  "pointsUsed": 50,
  "status": "completed",
  "metadata": {},
  "createdAt": "2024-12-19T21:30:00.000Z",
  "updatedAt": "2024-12-19T21:30:00.000Z"
}
```

**Error responses:**
- `401` - Unauthorized
- `404` - Redemption not found
- `500` - Internal server error

---

### PATCH /api/:brandId/redemptions/:redemptionId/cancel

**Auth:** Required

**Description:**  
Cancels a redemption. Only pending redemptions can be cancelled.

**Path parameters:**
- `brandId` (string, UUID) - The brand ID
- `redemptionId` (string, UUID) - The redemption ID

**Response (200 OK):**
```json
{
  "id": "redemption-id",
  "status": "cancelled",
  ...
}
```

**Error responses:**
- `400` - Redemption cannot be cancelled (already completed/cancelled)
- `401` - Unauthorized
- `404` - Redemption not found
- `500` - Internal server error

---

### POST /api/webhooks/ingest

**Auth:** Public (rate limited, no authentication required)

**Description:**  
Ingests webhook events from external providers (Shopify, Stripe). Automatically creates users if they don't exist, finds the active brand, and mints points based on order totals.

**Query parameters:**
- `brandId` (string, UUID, optional) - Brand ID to associate the webhook with

**Request body (JSON):**
```ts
{
  source: "shopify" | "stripe";  // Required
  event: string;                 // Required
  user: {
    email?: string;              // Optional, must be valid email if provided
    phone?: string;             // Optional
  };
  order: {
    id: string;                  // Required
    total: number;               // Required
    currency: string;            // Required
  };
  metadata: {
    raw_payload: any;           // Required, stores original webhook payload
  };
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "webhookEventId": "webhook-event-id"
}
```

**Error responses:**
- `400` - Validation error (invalid payload structure)
- `429` - Rate limit exceeded
- `500` - Internal server error

**Example:**
```bash
curl -X POST "https://rewards-production-a600.up.railway.app/api/webhooks/ingest?brandId=9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "shopify",
    "event": "order.created",
    "user": {
      "email": "customer@example.com"
    },
    "order": {
      "id": "order-123",
      "total": 100.00,
      "currency": "USD"
    },
    "metadata": {
      "raw_payload": {}
    }
  }'
```

---

## TEST-ONLY Endpoints

⚠️ **WARNING:** These endpoints are for automated smoke testing only. They bypass authentication when `SMOKE_TEST_BYPASS=true` is set. **DO NOT use these in frontend applications.**

### POST /api/__test/create-brand

**Auth:** Test-only (bypasses auth when `SMOKE_TEST_BYPASS=true`)

**Description:**  
Test route for creating a brand without authentication. Automatically creates a test user if it doesn't exist.

**Request body:** Same as `POST /api/brands`

**Response:** Same as `POST /api/brands`

---

### POST /api/__test/brands/:brandId/points/issue

**Auth:** Test-only

**Description:**  
Test route for issuing points without authentication.

**Request body:** Same as `POST /api/:brandId/points/issue`

**Response:** Same as `POST /api/:brandId/points/issue`

---

### GET /api/__test/brands/:brandId/points/balance/:userId

**Auth:** Test-only

**Description:**  
Test route for getting balance without authentication.

**Response:** Same as `GET /api/:brandId/points/balance/:userId`

---

### POST /api/__test/brands/:brandId/redemptions

**Auth:** Test-only

**Description:**  
Test route for creating redemptions without authentication.

**Request body:** Same as `POST /api/:brandId/redemptions`

**Response:** Same as `POST /api/:brandId/redemptions`

---

## Additional Endpoints

The following endpoints exist but are not fully documented here. They follow similar patterns:

- **Team Management:** `/api/brands/:brandId/members` (POST, GET, PATCH, DELETE)
- **Campaign Management:** `/api/brands/:brandId/campaigns` (POST, GET, PATCH, DELETE)
- **Fraud Detection:** `/api/brands/:brandId/fraud` (GET, PATCH)
- **Admin Operations:** `/api/admin/*` (platform admin only)

---

## Data Types

### BrandRole
```ts
enum BrandRole {
  OWNER    // Full access, can delete brand
  MANAGER  // Can manage points, campaigns, team members
  VIEWER   // Read-only access
}
```

### LedgerType
```ts
enum LedgerType {
  MINT  // Points issued/added
  BURN  // Points removed/burned
}
```

### RedemptionStatus
```ts
enum RedemptionStatus {
  pending    // Initial state
  completed  // Points burned, redemption fulfilled
  cancelled  // Redemption cancelled
}
```

---

## Error Response Format

All error responses follow this structure:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

Validation errors may include Zod error details:

```json
{
  "error": "Invalid webhook payload",
  "details": [
    {
      "path": ["user", "email"],
      "message": "Invalid email"
    }
  ]
}
```

---

## Rate Limiting

- **Webhook ingestion:** Rate limited (see `src/middleware/rateLimit.ts` for exact limits)
- **Other endpoints:** No rate limiting currently implemented

---

## Notes

- All UUIDs are in standard UUID v4 format
- All timestamps are in ISO 8601 format (UTC)
- Point amounts in the ledger are stored as strings (for precision) but returned as numbers in balance calculations
- The balance is calculated as: `SUM(MINT) - SUM(BURN)` for a given user/brand combination
- Users are automatically created in the database on first Clerk authentication
- Brand creation automatically adds the creator as OWNER

---

**Last Updated:** 2024-12-19  
**Source Files:**
- Routes: `src/routes/*.ts`
- Controllers: `src/controllers/*.ts`
- Validation: Zod schemas in routes and controllers
- Smoke Test: `scripts/mvp-smoke-test.ts`

