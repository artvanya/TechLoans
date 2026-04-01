# Nexus Platform — Deployment Guide

## Overview

The Nexus platform is a Turborepo monorepo with two Next.js 15 applications:

| App | Purpose | Subdomain |
|-----|---------|-----------|
| `apps/investor` | Investor-facing portal | `app.nexusprivatecredit.com` |
| `apps/admin` | Internal operator console | `admin.nexusprivatecredit.com` |

Both apps share `packages/db` (Prisma + PostgreSQL) and `packages/shared` (TypeScript types).

---

## Local Development

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for Postgres + Redis)

### 1. Clone and install

```bash
git clone https://github.com/your-org/nexus-platform.git
cd nexus-platform
pnpm install
```

### 2. Start database services

```bash
docker compose up -d
# Postgres: localhost:5432
# Redis:    localhost:6379
```

### 3. Configure environment

```bash
cp .env.template apps/investor/.env.local
cp .env.template apps/admin/.env.local
```

Edit both `.env.local` files. Minimum required for local dev:

```bash
DATABASE_URL="postgresql://nexus:nexus_dev_password@localhost:5432/nexus_development"
NEXTAUTH_SECRET="any-random-string-for-dev"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_NEXTAUTH_URL="http://localhost:3001"
# For emails in dev, use Resend test key or set EMAIL_PROVIDER=console
EMAIL_PROVIDER=console
# For storage in dev, use local filesystem or MinIO
STORAGE_PROVIDER=local
```

### 4. Run database migrations

```bash
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

### 5. Seed development data (dev only)

```bash
cd packages/db
npx prisma db seed
```

The seed creates:
- 1 super admin: `admin@nexus.local` / `Admin1234!@`
- 1 test investor: `investor@nexus.local` / `Investor1234!@` (KYC approved, with wallet balance)
- 3 sample live deals (no hardcoded amounts — all in database)

### 6. Start development servers

```bash
pnpm dev
# Investor portal: http://localhost:3000
# Admin console:   http://localhost:3001
```

---

## Production Deployment

### Option A: Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Create two Vercel projects:
   - `nexus-investor` → Root Directory: `apps/investor`
   - `nexus-admin`    → Root Directory: `apps/admin`
3. For each project, add all environment variables from `.env.template`
4. Set build command: `cd ../.. && pnpm build --filter=@nexus/investor` (or admin)
5. Deploy

**Important Vercel settings:**
- Node.js version: 20.x
- Framework preset: Next.js
- Install command: `pnpm install`

### Option B: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Create project
railway new nexus-platform

# Deploy investor app
railway up --service nexus-investor --root apps/investor

# Deploy admin app  
railway up --service nexus-admin --root apps/admin

# Add Postgres plugin via Railway dashboard
# Set DATABASE_URL in both services
```

### Option C: Docker (Self-hosted / AWS ECS)

```dockerfile
# apps/investor/Dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN turbo build --filter=@nexus/investor

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/investor/.next .next
COPY --from=builder /app/apps/investor/public public
COPY --from=builder /app/apps/investor/package.json .
COPY --from=builder /app/node_modules node_modules
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
```

---

## Database

### Migrations in production

```bash
# Run before each deployment
cd packages/db
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

### Backup strategy (recommended)

- Enable automated daily backups in your database provider (Railway, Supabase, AWS RDS)
- Retain 30 days of backups
- Test restore quarterly

---

## External Services to Configure

### 1. Email — Resend (required)

1. Sign up at resend.com
2. Add and verify your domain
3. Create API key
4. Set `RESEND_API_KEY` and `EMAIL_FROM`

### 2. File Storage — AWS S3 or Cloudflare R2

**AWS S3:**
1. Create bucket `nexus-platform-files` in `eu-west-2`
2. Block all public access
3. Create IAM user with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on your bucket
4. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`

**Cloudflare R2 (cheaper, no egress fees):**
1. Create R2 bucket
2. Create API token with R2 permissions
3. Set `STORAGE_PROVIDER=r2`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

### 3. KYC — Sumsub (required for production)

1. Create account at sumsub.com
2. Create applicant flow for "investor onboarding"
3. Set `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`
4. Configure webhook to `https://app.nexusprivatecredit.com/api/webhooks/sumsub`
5. Set `SUMSUB_WEBHOOK_SECRET`

### 4. Blockchain Custody — Fireblocks (production only)

1. Set `FIREBLOCKS_ENABLED=true` when ready
2. Configure `FIREBLOCKS_API_KEY` and `FIREBLOCKS_PRIVATE_KEY_PATH`
3. Create vaults for USDC, USDT, ETH on Polygon and Ethereum
4. Test in sandbox before enabling production

---

## Security Checklist

Before going live:

- [ ] `NEXTAUTH_SECRET` is a randomly generated 32+ byte string
- [ ] `JWT_SECRET` is different from `NEXTAUTH_SECRET`
- [ ] `CRON_SECRET` is set and validated in cron handlers
- [ ] Database connection uses SSL (`?sslmode=require` in DATABASE_URL)
- [ ] S3 bucket has public access blocked
- [ ] Admin app has IP allowlist configured (`ADMIN_ALLOWED_IPS`)
- [ ] Rate limiting is working (test with 6 failed logins)
- [ ] Email verification is working end-to-end
- [ ] Signed URL expiry is set appropriately (≤ 3600 seconds)
- [ ] Sentry DSN configured for error tracking
- [ ] All feature flags reviewed (`FIREBLOCKS_ENABLED=false` until ready)

---

## API Routes Summary

### Investor App (`apps/investor`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create investor account |
| GET | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Complete password reset |
| GET | `/api/dashboard` | Dashboard metrics |
| GET | `/api/deals` | List live deals (filtered) |
| GET | `/api/deals/[id]` | Deal detail |
| GET | `/api/investments` | Portfolio |
| POST | `/api/investments` | Create investment |
| GET | `/api/wallet` | Wallet balances + transactions |
| POST | `/api/wallet` | Withdrawal request |
| GET | `/api/auto-invest` | Auto-invest rules |
| PUT | `/api/auto-invest` | Save auto-invest rules |
| POST | `/api/kyc/upload` | Upload KYC document |
| GET | `/api/notifications` | Notifications |

### Admin App (`apps/admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/deals` | List / create deals |
| GET/PATCH | `/api/deals/[id]` | Get / update deal |
| POST | `/api/deals/[id]/documents` | Upload document |
| DELETE | `/api/deals/[id]/documents` | Delete document |
| GET/POST/PATCH | `/api/deals/[id]/images` | Manage images |
| GET/POST | `/api/deals/[id]/servicing` | Servicing log |
| GET | `/api/investors` | Investor list |
| GET | `/api/investors/[userId]` | Investor profile |
| POST | `/api/investors/[userId]/actions` | Restrict / restore / notify |
| GET | `/api/kyc` | KYC queue |
| POST | `/api/kyc/[caseId]` | Approve / reject KYC |
| GET/POST | `/api/payouts` | List / approve payouts |
| GET | `/api/withdrawals` | Withdrawal queue |
| POST | `/api/withdrawals/[id]` | Process withdrawal |
| GET | `/api/audit` | Audit log (supports CSV export) |
| GET | `/api/overview` | Operations dashboard metrics |

---

## RBAC Permissions Reference

| Role | Deals | Investors | KYC | Payouts | Withdrawals | Settings |
|------|-------|-----------|-----|---------|-------------|----------|
| `SUPER_ADMIN` | Full | Full | Full | Full | Full | Full |
| `ADMIN` | Full | Read+restrict | Read | Approve | Approve | Read |
| `COMPLIANCE_OFFICER` | Read | Read+KYC | Full | Read | Read | None |

Permissions are stored as string arrays on `AdminProfile.permissions` and enforced in middleware.

---

## Monitoring

### Recommended setup

1. **Sentry** — Error tracking for both apps (set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`)
2. **PostHog** — Product analytics for investor app (set `NEXT_PUBLIC_POSTHOG_KEY`)
3. **Uptime monitoring** — Use BetterUptime or similar to monitor both app URLs and `/api/health`

### Health check endpoint

Add to both apps:

```typescript
// apps/investor/src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@nexus/db'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
```
