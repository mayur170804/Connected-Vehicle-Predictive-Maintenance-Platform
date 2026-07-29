-- Phase 0 placeholder migration.
-- Real schema (vehicle, telemetry, maintenance_ticket, app_user) lands in Phase 1.
-- Kept here so Flyway has a baseline and the service boots cleanly against Postgres.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- provides gen_random_uuid() used by later migrations
