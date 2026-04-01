# Nexus Private Credit Platform

Institutional-grade private credit platform for senior secured real estate debt investing.

## Architecture

Turborepo monorepo with two Next.js 15 applications sharing a PostgreSQL database via Prisma.

```
nexus/
├── apps/
│   ├── investor/          # Investor-facing portal (app.nexusprivatecredit.com)
│   └── admin/             # Internal operator console (admin.nexusprivatecredit.com)
├── packages/
│   ├── db/                # Prisma schema + client (shared)
│   └── shared/            # TypeScript types + utilities (shared)
└── docs/
    ├── DEPLOYMENT.md      # Full deployment guide
    └── MIGRATIONS.md      # Database migration guide
```

## Quick Start (Local)

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres + Redis
docker compose up -d

# 3. Configure environment
cp .env.template apps/investor/.env.local
cp .env.template apps/admin/.env.local
# Edit both files — minimum: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL

# 4. Run migrations and seed
cd packages/db
npx prisma migrate dev
npx prisma db seed

# 5. Start development servers
cd ../..
pnpm dev
# Investor portal: http://localhost:3000
# Admin console:   http://localhost:3001
```

**Dev credentials (seed only):**
- Admin: `admin@nexus.local` / `Admin1234!@`
- Investor: `investor@nexus.local` / `Investor1234!@`

## Key Features

### Investor Portal
- Account registration with email verification
- KYC document upload + compliance review workflow
- Deal marketplace with real-time funding progress
- Investment flow with balance/KYC/capacity validation
- Portfolio tracking with expected vs realised returns
- Wallet management (GBP + USDC/USDT/ETH via Fireblocks)
- Auto-invest rules engine with diversification controls
- Credit line management
- Track record page with live platform statistics
- 2FA (TOTP) via authenticator app
- Password change + session management

### Admin Console
- Deal pipeline with full CRUD
- 6-step deal creation wizard with validation
- Document upload to S3 with per-category organisation
- Image upload with primary selection and reordering
- Real-time auto-invest engine triggered on deal publish
- KYC review queue with approve/reject/request-info
- Investor registry with restrict/restore/tier/notify
- Payout approval with wallet credit
- Withdrawal queue with approve/reject
- Immutable audit log with CSV export
- Servicing log for every deal event

### Infrastructure
- Separate auth flows for investor and admin (no cross-access)
- IP allowlist for admin console
- Rate limiting on auth endpoints (5 attempts, 15-min lockout)
- Admin: 3-attempt lockout
- bcrypt password hashing (cost factor 12)
- Email verification required before first login
- All admin actions write to immutable audit log
- S3/R2 private storage with signed URLs
- Vercel Cron for daily jobs (KYC reminders, monthly payout generation)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Auth | NextAuth v5 (JWT strategy, separate per app) |
| Database | PostgreSQL + Prisma ORM |
| Storage | AWS S3 / Cloudflare R2 |
| Email | Resend / Postmark |
| Custody | Fireblocks MPC (configurable, off by default) |
| KYC | Sumsub (configurable) |
| Cache/Queue | Redis + BullMQ |
| Deployment | Vercel (recommended) or Railway/Docker |

## Environment Variables

See `.env.template` for the full list with documentation.

## Deployment

See `docs/DEPLOYMENT.md` for full deployment instructions including:
- Vercel deployment
- Railway deployment  
- Docker deployment
- All external service setup
- Security checklist

## Database

See `docs/MIGRATIONS.md` for migration workflow.

## Security

- All private files use signed URLs (configurable expiry)
- KYC documents never publicly accessible
- Admin console can be IP-restricted
- All sensitive actions audit-logged with IP + actor
- No hardcoded credentials anywhere — all via environment variables
- Seed data only loads in development

## License

Private and confidential. All rights reserved.
