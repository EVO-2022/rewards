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

## Support

For issues or questions about the Integration API, contact your platform administrator or refer to the main API documentation in `API_OVERVIEW.md`.

