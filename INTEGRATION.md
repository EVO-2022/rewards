# Integration API Documentation

This document describes the Integration API endpoints for external applications to integrate with the Rewards platform using Brand API keys.

## Authentication

All integration endpoints require API key authentication. You can provide your API key in one of two ways:

1. **Authorization Header:**
   ```
   Authorization: Bearer rk_...
   ```

2. **X-API-Key Header:**
   ```
   X-API-Key: rk_...
   ```

API keys are scoped to a specific brand. All operations are automatically scoped to the brand associated with your API key.

## Base URL

- **Production:** `https://rewards-production-a600.up.railway.app/api/integration`
- **Local Development:** `http://localhost:3000/api/integration`

## Endpoints

### GET /whoami

Verify API key authentication and get brand context.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`

**Response (200 OK):**
```json
{
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "apiKeyId": "api-key-id",
  "status": "ok"
}
```

**Error Responses:**
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended

---

### POST /points/issue

Issue points to a user identified by an external user ID. If the user doesn't exist, they will be created automatically.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "externalUserId": "user-123",
  "points": 100,
  "reason": "purchase",
  "metadata": {
    "orderId": "order-456",
    "campaign": "summer-sale"
  }
}
```

**Field Descriptions:**
- `externalUserId` (string, required) - Your brand's identifier for this user. This is how you identify end-users in your system. Must be non-empty.
- `points` (number, required) - Number of points to issue. Must be a positive integer.
- `reason` (string, optional) - Descriptive reason for issuing points (e.g., "purchase", "referral", "signup").
- `metadata` (object, optional) - Additional context stored with the ledger entry (e.g., order ID, campaign name, etc.).

**Response (201 Created):**
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "externalUserId": "user-123",
  "pointsIssued": 100,
  "newBalance": 250,
  "ledgerEntryId": "ledger-entry-id"
}
```

**Response Fields:**
- `status` - Always "ok" on success
- `brandId` - The brand ID associated with your API key
- `userId` - Internal user ID (created automatically if user didn't exist)
- `externalUserId` - The external user ID you provided
- `pointsIssued` - Number of points that were issued
- `newBalance` - User's updated point balance after this issuance
- `ledgerEntryId` - ID of the ledger entry created for this transaction

**Error Responses:**
- `400` - Validation error (invalid request body)
  ```json
  {
    "error": "Validation error",
    "details": [
      {
        "path": ["points"],
        "message": "points must be a positive number"
      }
    ]
  }
  ```
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended
- `500` - Internal server error

**Example Request:**
```bash
curl -X POST "https://rewards-production-a600.up.railway.app/api/integration/points/issue" \
  -H "Authorization: Bearer rk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "customer-123",
    "points": 100,
    "reason": "purchase",
    "metadata": {
      "orderId": "order-456"
    }
  }'
```

**Example Response:**
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "externalUserId": "customer-123",
  "pointsIssued": 100,
  "newBalance": 100,
  "ledgerEntryId": "abc123-def456-ghi789"
}
```

---

### POST /points/redeem

Redeem points for a user identified by an external user ID. Points are deducted from the user's balance and a redemption record is created.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "externalUserId": "user-123",
  "points": 20,
  "reason": "test_redemption",
  "metadata": {
    "orderId": "ORD-456",
    "source": "integration-test"
  }
}
```

**Field Descriptions:**
- `externalUserId` (string, required) - Your brand's identifier for this user. Must be non-empty.
- `points` (number, required) - Number of points to redeem. Must be a positive integer (>= 1).
- `reason` (string, optional) - Descriptive reason for the redemption. Defaults to "integration_redeem" if not provided.
- `metadata` (object, optional) - Additional context stored with the redemption and ledger entry.

**Response (200 OK):**
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "externalUserId": "user-123",
  "pointsRedeemed": 20,
  "newBalance": 80,
  "redemptionId": "redemption-uuid",
  "ledgerEntryId": "ledger-entry-uuid"
}
```

**Error Responses:**

**Insufficient Points (400):**
```json
{
  "status": "error",
  "code": "INSUFFICIENT_POINTS",
  "message": "User does not have enough points to redeem",
  "required": 100,
  "available": 50
}
```

**Validation Error (400):**
```json
{
  "status": "error",
  "code": "INVALID_REQUEST",
  "message": "Validation error",
  "details": [
    {
      "path": ["points"],
      "message": "points must be a positive integer"
    }
  ]
}
```

**Other Errors:**
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended
- `500` - Internal server error
  ```json
  {
    "status": "error",
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong"
  }
  ```

**Example Request:**
```bash
curl -X POST "https://rewards-production-a600.up.railway.app/api/integration/points/redeem" \
  -H "Authorization: Bearer rk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "externalUserId": "customer-123",
    "points": 20,
    "reason": "purchase_redemption",
    "metadata": {
      "orderId": "order-456"
    }
  }'
```

**Example Response:**
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "externalUserId": "customer-123",
  "pointsRedeemed": 20,
  "newBalance": 80,
  "redemptionId": "abc123-def456-ghi789",
  "ledgerEntryId": "xyz789-abc123-def456"
}
```

**Notes:**
- Redemptions are processed atomically (transaction). If either the redemption record or ledger entry creation fails, both are rolled back.
- The user is automatically created if they don't exist (same as the issue endpoint).
- Points are burned immediately and the redemption status is set to "completed".
- The `newBalance` is calculated as the previous balance minus the redeemed points.

---

### GET /points/balance

Get the current point balance for a user identified by an external user ID.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`

**Query Parameters:**
- `externalUserId` (string, required) - Your brand's identifier for this user. Must be non-empty.

**Response (200 OK):**

If user exists and has points:
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "externalUserId": "user-123",
  "balance": 250
}
```

If user has never earned points (doesn't exist in system):
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": null,
  "externalUserId": "user-123",
  "balance": 0
}
```

**Note:** A balance of 0 with `userId: null` means the user has never earned points. This is not an error condition.

**Error Responses:**
- `400` - Validation error (missing or empty externalUserId)
  ```json
  {
    "error": "Validation error",
    "details": [
      {
        "path": ["externalUserId"],
        "message": "externalUserId is required and must be non-empty"
      }
    ]
  }
  ```
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended
- `500` - Internal server error

**Example Request:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/points/balance?externalUserId=customer-123" \
  -H "Authorization: Bearer rk_..."
```

---

### GET /points/history

Get the points ledger history for a user identified by an external user ID. Returns all point transactions (earned, redeemed, adjusted) in chronological order.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`

**Query Parameters:**
- `externalUserId` (string, required) - Your brand's identifier for this user. Must be non-empty.
- `limit` (number, optional) - Number of items to return. Default: 20, Max: 100.
- `cursor` (string, optional) - ISO datetime string for cursor-based pagination. Use `nextCursor` from previous response.
- `type` (string, optional) - Filter by ledger type: `MINT` (earned), `BURN` (redeemed), or other enum values.
- `since` (string, optional) - ISO datetime string. Only return records with `createdAt >= since`.

**Response (200 OK):**

If user exists:
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "externalUserId": "user-123",
  "items": [
    {
      "id": "ledger-uuid",
      "type": "MINT",
      "amount": 50,
      "reason": "test_purchase",
      "metadata": {
        "orderId": "ORD-123",
        "source": "smoke-test"
      },
      "createdAt": "2025-12-10T23:52:57.047Z"
    },
    {
      "id": "ledger-uuid-2",
      "type": "BURN",
      "amount": 20,
      "reason": "integration_redeem",
      "metadata": {
        "redemptionId": "redemption-uuid"
      },
      "createdAt": "2025-12-10T23:50:12.000Z"
    }
  ],
  "hasMore": false,
  "nextCursor": null
}
```

If user has never earned points (doesn't exist in system):
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "externalUserId": "user-123",
  "items": [],
  "hasMore": false,
  "nextCursor": null
}
```

**Note:** Items are sorted by `createdAt` descending (most recent first). A `nextCursor` is provided when `hasMore` is `true` for pagination.

**Error Responses:**
- `400` - Validation error (missing externalUserId, invalid limit/type/since/cursor)
  ```json
  {
    "status": "error",
    "code": "INVALID_REQUEST",
    "message": "Validation error",
    "details": [...]
  }
  ```
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended
- `500` - Internal server error
  ```json
  {
    "status": "error",
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong"
  }
  ```

**Example Request:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/points/history?externalUserId=user-123&limit=20" \
  -H "Authorization: Bearer rk_..."
```

**Example with filters:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/points/history?externalUserId=user-123&type=MINT&since=2025-12-01T00:00:00Z&limit=50" \
  -H "Authorization: Bearer rk_..."
```

**Pagination Example:**
```bash
# First page
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/points/history?externalUserId=user-123&limit=20" \
  -H "Authorization: Bearer rk_..."

# Next page (using cursor from previous response)
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/points/history?externalUserId=user-123&limit=20&cursor=2025-12-10T23:50:12.000Z" \
  -H "Authorization: Bearer rk_..."
```

---

### GET /redemptions/history

Get the redemption history for a user identified by an external user ID. Returns all redemption records in chronological order.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`

**Query Parameters:**
- `externalUserId` (string, required) - Your brand's identifier for this user. Must be non-empty.
- `limit` (number, optional) - Number of items to return. Default: 20, Max: 100.
- `cursor` (string, optional) - ISO datetime string for cursor-based pagination. Use `nextCursor` from previous response.
- `status` (string, optional) - Filter by redemption status: `pending`, `completed`, `cancelled`.
- `since` (string, optional) - ISO datetime string. Only return records with `createdAt >= since`.

**Response (200 OK):**

If user exists:
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "externalUserId": "user-123",
  "items": [
    {
      "id": "redemption-uuid",
      "points": 20,
      "reason": "test_redemption",
      "metadata": {
        "orderId": "ORD-456",
        "source": "integration-test"
      },
      "status": "completed",
      "createdAt": "2025-12-10T23:59:12.000Z"
    }
  ],
  "hasMore": false,
  "nextCursor": null
}
```

If user has never made a redemption (doesn't exist in system):
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "externalUserId": "user-123",
  "items": [],
  "hasMore": false,
  "nextCursor": null
}
```

**Note:** Items are sorted by `createdAt` descending (most recent first). A `nextCursor` is provided when `hasMore` is `true` for pagination.

**Error Responses:**
- `400` - Validation error (missing externalUserId, invalid limit/status/since/cursor)
  ```json
  {
    "status": "error",
    "code": "INVALID_REQUEST",
    "message": "Validation error",
    "details": [...]
  }
  ```
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended
- `500` - Internal server error
  ```json
  {
    "status": "error",
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong"
  }
  ```

**Example Request:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/redemptions/history?externalUserId=user-123&limit=20" \
  -H "Authorization: Bearer rk_..."
```

**Example with filters:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/redemptions/history?externalUserId=user-123&status=completed&since=2025-12-01T00:00:00Z&limit=50" \
  -H "Authorization: Bearer rk_..."
```

**Pagination Example:**
```bash
# First page
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/redemptions/history?externalUserId=user-123&limit=20" \
  -H "Authorization: Bearer rk_..."

# Next page (using cursor from previous response)
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/redemptions/history?externalUserId=user-123&limit=20&cursor=2025-12-10T23:59:12.000Z" \
  -H "Authorization: Bearer rk_..."
```

---

### POST /events

Send custom events to the Rewards platform. Events are logged and can be used for tracking user actions, analytics, or triggering future webhook integrations.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "eventName": "purchase.completed",
  "externalUserId": "user-123",
  "metadata": {
    "orderId": "ORD-123",
    "amount": 42.5,
    "currency": "USD"
  }
}
```

**Field Descriptions:**
- `eventName` (string, required) - Name of the event (e.g., "purchase.completed", "signup", "referral"). Must be non-empty.
- `externalUserId` (string, required) - Your brand's identifier for this user. Must be non-empty.
- `metadata` (object, optional) - Additional context about the event (e.g., order details, campaign info, etc.).

**Response (200 OK):**
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "externalUserId": "user-123",
  "eventName": "purchase.completed"
}
```

**Error Responses:**

**Validation Error (400):**
```json
{
  "status": "error",
  "code": "INVALID_REQUEST",
  "message": "Validation error",
  "details": [
    {
      "path": ["eventName"],
      "message": "eventName is required and must be non-empty"
    }
  ]
}
```

**Other Errors:**
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended
- `500` - Internal server error
  ```json
  {
    "status": "error",
    "code": "INTERNAL_ERROR",
    "message": "Failed to process event"
  }
  ```

**Example Request:**
```bash
curl -X POST "https://rewards-production-a600.up.railway.app/api/integration/events" \
  -H "Authorization: Bearer rk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "purchase.completed",
    "externalUserId": "customer-123",
    "metadata": {
      "orderId": "ORD-456",
      "amount": 99.99,
      "currency": "USD"
    }
  }'
```

**Example Response:**
```json
{
  "status": "ok",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "externalUserId": "customer-123",
  "eventName": "purchase.completed"
}
```

**Notes:**
- Events are brand-scoped by the API key (no brandId in the URL)
- Events are logged server-side but not stored in the database in this MVP version
- The `metadata` field can contain any JSON-serializable data
- Events can be used for analytics, debugging, or future webhook integrations

---

### GET /users/:externalUserId/balance (Legacy)

**Note:** This endpoint uses path parameters instead of query parameters. The `/points/balance` endpoint above is the recommended approach.

Get the current point balance for a user identified by an external user ID.

**Headers:**
- `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>`

**Path Parameters:**
- `externalUserId` (string) - Your brand's identifier for this user

**Response (200 OK):**
```json
{
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "externalUserId": "user-123",
  "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
  "balance": 250
}
```

If the user doesn't exist, returns balance 0:
```json
{
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "externalUserId": "user-123",
  "userId": undefined,
  "balance": 0
}
```

**Error Responses:**
- `401` - Missing or invalid API key
- `403` - Brand is inactive or suspended
- `500` - Internal server error

**Example Request:**
```bash
curl -X GET "https://rewards-production-a600.up.railway.app/api/integration/users/customer-123/balance" \
  -H "Authorization: Bearer rk_..."
```

---

## User Mapping

The Integration API uses a special user mapping system:

- **External User ID:** Your brand's identifier for end-users (e.g., `"customer-123"`, `"user-456"`)
- **Internal User ID:** Automatically generated UUID in the Rewards system

When you issue points with an `externalUserId`, the system:
1. Checks if a user already exists for this brand + externalUserId combination
2. If not found, creates a new user automatically
3. Links the user to your brand via the API key's brand scope

The mapping is stored using a special `clerkId` pattern: `integration_{brandId}_{externalUserId}`. This ensures:
- Each brand's external user IDs are isolated
- The same externalUserId can exist for different brands
- Users are automatically created on first points issuance

## Error Handling

All endpoints return JSON error responses. Never redirects.

**Common Error Codes:**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid API key)
- `403` - Forbidden (brand inactive/suspended)
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": "Error message",
  "details": [...] // Optional, for validation errors
}
```

## Rate Limiting

Currently, there is no rate limiting on integration endpoints. This may be added in the future.

## Best Practices

1. **Store API Keys Securely:** Never commit API keys to version control. Use environment variables or secure secret management.

2. **Use Metadata:** Include relevant context in the `metadata` field (order IDs, campaign names, etc.) for better tracking and debugging.

3. **Handle Errors Gracefully:** Always check response status codes and handle errors appropriately in your integration.

4. **Idempotency:** The current implementation does not prevent duplicate point issuances. If you need idempotency, include a unique identifier in the `metadata` field and check for duplicates before issuing.

5. **Monitor Balances:** Use the `/users/:externalUserId/balance` endpoint to verify point balances after issuance.

## Webhooks

Webhooks allow you to receive real-time notifications when points are issued or redeemed via the Integration API. This enables you to keep your systems in sync without polling.

### Events

The following events are available:

- `points.issued` - Triggered when points are issued to a user via `POST /integration/points/issue`
- `points.redeemed` - Triggered when points are redeemed by a user via `POST /integration/points/redeem`

### Webhook Payload Format

When an event occurs, a POST request is sent to your registered webhook URL with the following payload:

```json
{
  "event": "points.issued",
  "data": {
    "type": "points.issued",
    "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
    "userId": "46d521bb-1d84-4baf-a743-f536e1f5b31d",
    "externalUserId": "user-123",
    "points": 50,
    "ledgerEntryId": "ledger-entry-uuid",
    "redemptionId": null,
    "createdAt": "2025-12-11T00:00:00.000Z",
    "metadata": {
      "reason": "purchase",
      "apiKeyId": "api-key-id",
      "integration": true,
      "orderId": "ORD-123",
      "source": "website"
    }
  }
}
```

**For `points.redeemed` events:**
- `redemptionId` will contain the redemption record ID
- `ledgerEntryId` will contain the ledger entry ID for the burn transaction
- `type` will be `"points.redeemed"`

### Webhook Headers

Each webhook request includes the following headers:

- `Content-Type: application/json`
- `X-Rewards-Brand-Id` - The brand ID associated with the event
- `X-Rewards-Event-Type` - The event type (e.g., `points.issued`, `points.redeemed`)

### Registering Webhooks

Webhooks are managed via the Admin API (Clerk-authenticated, not API key auth). You must be a member of the brand to manage webhooks.

**Create a Webhook Subscription:**

```bash
POST /api/brands/:brandId/webhooks
Authorization: Bearer <clerk-session-token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/rewards",
  "eventTypes": ["points.issued", "points.redeemed"],
  "secret": "optional-hmac-secret"
}
```

**Request Body:**
- `url` (string, required) - The webhook URL that will receive POST requests. Must start with `http://` or `https://`.
- `eventTypes` (array, optional) - Array of event types to subscribe to. Defaults to `["points.issued", "points.redeemed"]` if not provided. Use `["*"]` to subscribe to all events.
- `secret` (string, optional) - Optional HMAC secret for signing payloads (not yet implemented, stored for future use).

**Response (201 Created):**
```json
{
  "id": "webhook-subscription-uuid",
  "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
  "url": "https://your-app.com/webhooks/rewards",
  "eventTypes": ["points.issued", "points.redeemed"],
  "isActive": true,
  "createdAt": "2025-12-11T00:00:00.000Z",
  "updatedAt": "2025-12-11T00:00:00.000Z",
  "lastSuccess": null,
  "lastError": null,
  "lastErrorMessage": null
}
```

**List Webhook Subscriptions:**

```bash
GET /api/brands/:brandId/webhooks
Authorization: Bearer <clerk-session-token>
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "webhook-subscription-uuid",
      "brandId": "9729d730-6fbb-4dd8-abc9-cdf1dcf21e5f",
      "url": "https://your-app.com/webhooks/rewards",
      "eventTypes": ["points.issued", "points.redeemed"],
      "isActive": true,
      "createdAt": "2025-12-11T00:00:00.000Z",
      "updatedAt": "2025-12-11T00:00:00.000Z",
      "lastSuccess": "2025-12-11T01:00:00.000Z",
      "lastError": null,
      "lastErrorMessage": null
    }
  ]
}
```

**Delete/Disable a Webhook:**

```bash
DELETE /api/brands/:brandId/webhooks/:webhookId
Authorization: Bearer <clerk-session-token>
```

**Response (204 No Content)**

This performs a soft delete (sets `isActive: false`). The webhook will no longer receive events.

### Webhook Delivery

- **Synchronous Delivery:** Webhooks are sent synchronously after the successful completion of the points transaction. The Integration API response is returned only after the transaction completes, but webhook delivery failures do not affect the API response.
- **Best-Effort:** Webhook delivery is best-effort. If your webhook endpoint is unavailable or returns an error, the failure is logged but does not retry in this MVP version.
- **Error Tracking:** Each webhook subscription tracks `lastSuccess`, `lastError`, and `lastErrorMessage` timestamps for monitoring purposes.
- **No Retries:** Currently, there are no automatic retries for failed webhook deliveries. This may be added in future versions.

### Security Notes

- **Secret Field:** The `secret` field is currently stored but not used for HMAC signatures. This will be implemented in a future update to allow you to verify webhook authenticity.
- **HTTPS Recommended:** Always use HTTPS URLs for webhook endpoints in production to ensure secure delivery.
- **Idempotency:** Your webhook handler should be idempotent. The same event may be delivered multiple times in future versions with retry logic.

### Example Webhook Handler

Here's a simple example of a webhook handler in Node.js:

```javascript
app.post("/webhooks/rewards", express.json(), async (req, res) => {
  const event = req.body.event;
  const data = req.body.data;
  const brandId = req.headers["x-rewards-brand-id"];
  const eventType = req.headers["x-rewards-event-type"];

  console.log(`Received ${eventType} event for brand ${brandId}`);

  if (event === "points.issued") {
    // Handle points issued event
    console.log(`User ${data.externalUserId} earned ${data.points} points`);
    // Update your system, send notifications, etc.
  } else if (event === "points.redeemed") {
    // Handle points redeemed event
    console.log(`User ${data.externalUserId} redeemed ${data.points} points`);
    // Update your system, process redemption, etc.
  }

  // Always return 200 OK to acknowledge receipt
  res.status(200).json({ received: true });
});
```

## Support

For issues or questions about the Integration API, contact your platform administrator or refer to the main API documentation in `API_OVERVIEW.md`.

