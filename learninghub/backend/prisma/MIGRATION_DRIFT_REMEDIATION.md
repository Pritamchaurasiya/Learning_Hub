# Prisma migration drift remediation

This note records the verified migration gap found while stabilizing PR #226. It is a recovery procedure, not a generated migration. Do not apply hand-written DDL to a production database until the actual database state has been inspected and a backup has been restored successfully in staging.

## Verified evidence

The learninghub/backend/prisma/migrations tree currently contains one SQL migration: 20260419094723_init.

The migration and the current Prisma schema do not describe the same database:

- The initial migration creates the tests table without deletedAt; the current Test model includes deletedAt.
- The initial migration creates the questions table without imageUrl; the current Question model includes imageUrl.
- The initial migration creates a quoted mixed-case table named "Problem"; the current Problem model maps to the lowercase table problems and includes additional fields/indexes.
- The latest verified E2E run (GitHub Actions run 41318871270, commit 8ee5710) logged PostgreSQL errors for the missing tests.deletedAt column, missing questions.imageUrl column, and missing public.problems relation.

A successful prisma migrate deploy only means the migrations present in the migrations directory were applied. It does not prove that those migrations fully represent the current schema.prisma.

## Generate the complete diff safely

Run from learninghub/backend against disposable PostgreSQL databases only. The application database URL and shadow database URL must point to different databases. Never use production credentials for this operation.

    export DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/learninghub_migration_scratch'
    export DIRECT_URL="$DATABASE_URL"
    export SHADOW_DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/learninghub_shadow'

    npx prisma validate
    npx prisma migrate status

    npx prisma migrate diff \
      --from-migrations prisma/migrations \
      --to-schema-datamodel prisma/schema.prisma \
      --shadow-database-url "$SHADOW_DATABASE_URL" \
      --script > /tmp/learninghub-prisma-drift.sql

    wc -l /tmp/learninghub-prisma-drift.sql
    sha256sum /tmp/learninghub-prisma-drift.sql

Review the full SQL before creating a migration. In particular, search for destructive or data-changing statements:

    grep -nEi '\b(DROP TABLE|DROP COLUMN|DROP TYPE|TRUNCATE|DELETE FROM)\b' \
      /tmp/learninghub-prisma-drift.sql || true

Also review every ALTER COLUMN, ADD COLUMN NOT NULL, foreign-key creation, enum change, unique constraint and index. New required fields need a safe default or a staged backfill before a NOT NULL constraint is applied to existing rows.

## Preserve the legacy Problem data

The Problem versus problems naming mismatch needs a deliberate data-preservation decision. Before writing the final migration, inspect the target database:

    SELECT
      to_regclass('public."Problem"') AS legacy_problem_table,
      to_regclass('public.problems') AS mapped_problem_table;

If only the legacy table exists, a rename may be the correct preservation strategy, but confirm its columns, indexes, constraints, row count and references first. If both tables exist, stop and plan a reviewed merge; do not drop either table automatically. The generated diff may propose drop-and-create because it sees two different table names, so do not copy such a diff into a production migration without reconciling it.

## Required migration validation

1. Take a fresh database backup with pg_dump --format=custom and verify that it can be restored into a separate staging database.
2. Generate the proposed migration from the migration history and current schema, then review destructive operations and data backfills.
3. Apply the migration to a restored staging copy and a fresh empty database.
4. Confirm expected row counts, foreign keys, unique constraints, indexes and application queries.
5. Run prisma migrate status, backend tests and the Live Node API Playwright E2E suite.
6. Add a schema-parity gate after the new migration is committed:

    npx prisma migrate diff \
      --from-migrations prisma/migrations \
      --to-schema-datamodel prisma/schema.prisma \
      --shadow-database-url "$SHADOW_DATABASE_URL" \
      --exit-code

The parity gate should report no diff after the migration is added. Do not substitute prisma db push for a reviewed migration in production; that would conceal the migration-history problem rather than repair it.

## Separate E2E finding

The same historical E2E run also showed the first-visit country-consent dialog blocking clicks. The Playwright configuration now seeds the location-consent decision for normal test journeys, and a dedicated first-visit test covers the Skip for now path. CI is also configured to retain Playwright screenshots, traces and HTML reports for seven days on failure.

The country-consent changes have not yet been validated by a new GitHub Actions run. The last verified run remains 41318871270; it predates these fixes.

## Separate production-security follow-up

The Django regex-based input filter is not a complete HTML sanitizer or output-encoding strategy. Keep that work separate: use context-aware output encoding, an allowlist sanitizer only where rich HTML is intentionally supported, and regression tests for stored and reflected XSS cases.
