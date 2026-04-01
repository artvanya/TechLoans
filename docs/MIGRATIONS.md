# Database Migrations

## Overview

This project uses Prisma with PostgreSQL. All schema changes must go through migrations.

## Local development

```bash
cd packages/db

# Apply existing migrations
npx prisma migrate dev

# Create a new migration after editing schema.prisma
npx prisma migrate dev --name describe_your_change

# Reset database (destroys all data — dev only)
npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Seed with development data
npx prisma db seed
```

## Production deployments

```bash
# Run this before each production deployment
DATABASE_URL="your-production-url" npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate
```

## Important rules

1. **Never edit migration files** after they are committed.
2. **Never run `migrate reset`** in production — it destroys all data.
3. **Always run `migrate deploy`** before deploying new code that requires schema changes.
4. **The seed script refuses to run in production** — it checks `NODE_ENV`.
5. All migrations are additive where possible — avoid dropping columns with data.

## Migration file location

```
packages/db/prisma/migrations/
  YYYYMMDDHHMMSS_migration_name/
    migration.sql
```

## Schema change checklist

- [ ] Edit `packages/db/prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name your_change_name`
- [ ] Run `npx prisma generate` to update the client
- [ ] Test locally
- [ ] Commit both `schema.prisma` and the new migration folder
- [ ] In CI/CD: run `npx prisma migrate deploy` before app deployment
