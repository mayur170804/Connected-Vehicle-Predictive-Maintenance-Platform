# Connected Vehicle Predictive Maintenance Platform

A zero-cost, fully local, event-driven prototype: simulated vehicle telemetry →
Kafka → Spring Boot ingestion → Python risk scoring → automatic maintenance
tickets → React dashboard.

> **Status: Phase 0 (scaffolding).** Every service boots and reports healthy,
> but business logic (schema, Kafka wiring, risk rules, tickets, auth, UI
> pages) is not implemented yet. See "Roadmap" below for what's next.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin) — this is the only hard
  requirement to run the stack.
- Optional, for local (non-Docker) development of individual services:
  - Java 21 + Maven 3.9+ (telemetry-service)
  - Python 3.12+ (risk-service, vehicle-simulator)
  - Node.js 20+ (dashboard)

## Quick start (Phase 0)

```bash
cp .env.example .env
docker compose up --build
```

Once containers are up, verify each service is healthy:

| Service | Check | Expected |
|---|---|---|
| Postgres | `docker compose ps` | `healthy` |
| Kafka | `docker compose ps` | `healthy` |
| Kafka UI | http://localhost:8081 | topic browser UI |
| risk-service | http://localhost:8000/health | `{"status": "UP"}` |
| telemetry-service | http://localhost:8080/actuator/health | `{"status": "UP", ...}` |
| dashboard | http://localhost:5173 | shows telemetry-service health inline |
| vehicle-simulator | `docker compose logs -f vehicle-simulator` | heartbeat log lines |

Tear down:

```bash
docker compose down          # stop containers
docker compose down -v       # also wipe the Postgres volume
```

## Architecture

```
vehicle-simulator ──► Kafka(vehicle-telemetry) ──► telemetry-service (consumer)
                                                        │
                                                        ├─► Postgres (persist telemetry)
                                                        ├─► risk-service (HTTP /score)
                                                        └─► if HIGH risk:
                                                              ├─► Postgres (create ticket, idempotent)
                                                              └─► Kafka(maintenance-alerts)

React dashboard ──► telemetry-service REST API (JWT-secured)
```

Full design rationale (why Kafka sits where it does, idempotency strategy,
sync vs async risk scoring) is in `docs/architecture.md` (added in Phase 1).

## Repository layout

```
telemetry-service/   Spring Boot (Java 21) — REST API, Kafka consumer, JWT auth, Postgres
risk-service/         Python FastAPI — stateless rule-based risk scoring
vehicle-simulator/    Python — publishes simulated telemetry to Kafka
dashboard/            React + TypeScript (Vite) — vehicles / telemetry / tickets UI
docs/                 Architecture notes, diagrams
```

## Environment variables

See `.env.example` for the full list with defaults. Nothing needs to be
changed to run locally — the defaults are self-contained and cost-free.

## Roadmap (see project plan for full detail)

- [x] Phase 0 — scaffolding, all services boot, health checks pass
- [x] Phase 1 — Postgres schema (Flyway), Vehicle CRUD, JWT auth skeleton
- [x] Phase 2 — Kafka producer/consumer wiring, simulator publishes real telemetry
- [ ] Phase 3 — risk-service rule engine + tests
- [ ] Phase 4 — consumer → risk-service → idempotent ticket creation → alerts topic
- [ ] Phase 5 — remaining REST endpoints, role-based access enforcement
- [ ] Phase 6 — dashboard pages (vehicles, telemetry history, tickets)
- [ ] Phase 7 — structured logging polish, full README (API examples, test
      instructions), unit + integration test suite finalized

## Phase 1: Auth + Vehicle CRUD

Two dev accounts are auto-seeded on first startup (see `DevUserSeeder`):

| username | password | role |
|---|---|---|
| admin | password123 | ADMIN |
| operator | password123 | OPERATOR |

**Login and get a JWT:**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

Response:
```json
{"token": "eyJ...", "username": "admin", "role": "ADMIN", "expiresInSeconds": 3600}
```

**Create a vehicle (ADMIN only):**

```bash
TOKEN="<paste token here>"
curl -X POST http://localhost:8080/api/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vin": "1HGCM82633A123456", "make": "Honda", "model": "Accord", "year": 2022}'
```

**List vehicles (ADMIN or OPERATOR):**

```bash
curl http://localhost:8080/api/vehicles -H "Authorization: Bearer $TOKEN"
```

Every endpoint under `/api/**` (except `/api/auth/**`) requires a valid
Bearer token — a missing/expired/invalid token yields `401`, and a token with
the wrong role yields `403`.

## Phase 2: Telemetry ingestion (Kafka)

The vehicle-simulator now does real work on startup: it logs in as `admin`,
creates (or reuses) `SIMULATOR_VEHICLE_COUNT` vehicles, then publishes a
telemetry event straight to the `vehicle-telemetry` Kafka topic every
`SIMULATOR_INTERVAL_SECONDS`, with ~8% of ticks injecting an anomaly
(overheat, high vibration, low battery, or a critical fault code) so
risk scoring in later phases has real signal to react to.

`telemetry-service` consumes that same topic and persists each event
idempotently (duplicate `vehicleId` + `timestamp` is a no-op, not a new row).

**Watch it working:**

```bash
docker compose logs -f vehicle-simulator     # see events being published
docker compose logs -f telemetry-service     # see them being consumed/persisted
```

**Or inspect via Kafka UI:** http://localhost:8081 → topic `vehicle-telemetry`.

**Query telemetry history for a vehicle:**

```bash
# Get a vehicle id from GET /api/vehicles first, then:
curl http://localhost:8080/api/vehicles/<vehicle-id>/telemetry \
  -H "Authorization: Bearer $TOKEN"
```

**Manually publish one event via REST** (goes through the same Kafka topic
and consumer as the simulator — useful for testing specific values):

```bash
curl -X POST http://localhost:8080/api/telemetry \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "<vehicle-id>",
    "timestamp": "2026-07-29T10:00:00Z",
    "engineTemperature": 110.5,
    "batteryLevel": 20.0,
    "vibration": 9.2,
    "mileage": 85000,
    "faultCode": "P0300"
  }'
```

Note: `risk_level` on each telemetry row stays `null` until Phase 4 wires in
the risk-service call — for now every event is simply persisted as-is.

## Running tests

```bash
cd telemetry-service
mvn test          # unit tests only (VehicleServiceTest, AuthServiceTest, TelemetryIngestServiceTest) - no Docker needed
mvn verify        # also runs TelemetryKafkaFlowIT (Testcontainers: real Kafka + Postgres) - Docker required
```

`TelemetryKafkaFlowIT` publishes raw JSON directly to the `vehicle-telemetry`
topic in a throwaway Testcontainers Kafka+Postgres pair, and asserts (a) the
event is consumed and persisted, and (b) publishing the exact same event
twice results in exactly one row — proving the idempotency requirement at
the persistence layer.

Python suites (`pytest`) will apply starting Phase 3 (risk-service rules).

## Development Progress

- [x] Phase 0 — Project scaffolding
- [x] Phase 1 — Vehicle CRUD + JWT authentication
- [x] Phase 2 — Kafka telemetry ingestion
- [x] Phase 3 — Risk scoring service
- [ ] Phase 4 — Risk integration + maintenance tickets
- [ ] Phase 5 — REST API completion + role enforcement
- [ ] Phase 6 — Dashboard completion
- [ ] Phase 7 — Final testing + documentation

See `CHANGELOG.md` for development notes.