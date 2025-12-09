# Azure Migration Playbook

## Current State

- Dockerized Node API
- Prisma ORM
- Railway PostgreSQL
- Railway hosting

## Target Azure Stack

- Azure App Service (Docker)
- Azure PostgreSQL Flexible Server
- Blob Storage (future)
- GitHub Actions CI/CD

## Migration Steps

1. Create Azure Resource Group
2. Create Container Registry
3. Add GitHub Secrets:
   - AZURE_CREDENTIALS
   - AZURE_REGISTRY
   - AZURE_USERNAME
   - AZURE_PASSWORD
   - AZURE_IMAGE
   - AZURE_RESOURCE_GROUP
   - AZURE_APP_NAME
   - AZURE_DB_USER
   - AZURE_DB_PASS

4. Provision Infra
5. Set env vars in Azure
   > Configure all variables from the "Required Environment Variables" section in the App Service Configuration.
6. Run Prisma migrate deploy
7. Swap DNS
8. Decommission Railway

## Required Environment Variables

- PORT – Server port (default: 8080)
- NODE_ENV – Environment mode (production/development/test)
- DATABASE_URL – PostgreSQL connection string
- CLERK_PUBLISHABLE_KEY – Clerk authentication public key
- CLERK_SECRET_KEY – Clerk authentication secret key
- JWT_SECRET – JWT signing secret (optional)
- RATE_LIMIT_WINDOW_MS – Rate limit time window in milliseconds (default: 900000)
- RATE_LIMIT_MAX_REQUESTS – Maximum requests per window (default: 100)

## Rollback Strategy

- DNS flip back
- Railway stays intact until Azure verified

