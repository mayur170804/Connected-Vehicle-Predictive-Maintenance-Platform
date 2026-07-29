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
- [ ] Phase 1 — Postgres schema (Flyway), Vehicle CRUD, JWT auth skeleton
- [ ] Phase 2 — Kafka producer/consumer wiring, simulator publishes real telemetry
- [ ] Phase 3 — risk-service rule engine + tests
- [ ] Phase 4 — consumer → risk-service → idempotent ticket creation → alerts topic
- [ ] Phase 5 — remaining REST endpoints, role-based access enforcement
- [ ] Phase 6 — dashboard pages (vehicles, telemetry history, tickets)
- [ ] Phase 7 — structured logging polish, full README (API examples, test
      instructions), unit + integration test suite finalized

## Running tests

Not yet applicable — test suites land alongside their respective phases
(Java: JUnit + Mockito + Testcontainers; Python: pytest). This section will
be filled in with exact commands (`mvn test`, `pytest`, etc.) as each phase
completes.
