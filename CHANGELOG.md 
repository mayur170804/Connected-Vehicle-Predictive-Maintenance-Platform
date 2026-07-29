# Development Changelog

## 29 July 2026

### Status

Phases 0–3 completed.

The platform now supports vehicle management, JWT authentication,
simulated telemetry generation, Kafka-based telemetry ingestion,
PostgreSQL persistence, risk scoring, and an initial fleet dashboard.

Phase 4 is next: connecting persisted telemetry to the risk scoring service
and creating maintenance tickets for high-risk events.

---

## Phase 0 — Project Scaffolding

- Created the initial multi-service project structure.
- Added Spring Boot telemetry service.
- Added FastAPI risk scoring service.
- Added React + TypeScript dashboard.
- Added Python vehicle simulator.
- Added PostgreSQL.
- Added Kafka and Kafka UI.
- Added Dockerfiles for application services.
- Added Docker Compose configuration.
- Added service health checks.
- Verified the local stack starts successfully.

---

## Phase 1 — Vehicle Management and Authentication

### Vehicle Management

- Added Vehicle entity and persistence layer.
- Added Vehicle CRUD service.
- Added vehicle REST endpoints.
- Added VIN duplicate validation.
- Added request validation for:
  - VIN
  - Make
  - Model
  - Year
- Added API error handling for:
  - Resource not found
  - Duplicate resources
  - Validation failures

### Authentication

- Added JWT-based authentication.
- Added login endpoint:

  `POST /api/auth/login`

- Added stateless Spring Security configuration.
- Added JWT authentication filter.
- Added BCrypt password hashing.
- Added ADMIN and OPERATOR roles.
- Added development user seeding.
- Protected application API endpoints.
- Kept authentication and health endpoints publicly accessible.

### Database

- Added PostgreSQL persistence.
- Added Flyway database migrations.
- Added application user tables.
- Added vehicle tables.
- Added telemetry schema.

---

## Phase 2 — Telemetry Pipeline

### Vehicle Simulator

- Implemented the Python vehicle simulator.
- Simulator authenticates with the telemetry service using JWT.
- Simulator creates or reuses 5 simulated vehicles:

  - `SIM-00001`
  - `SIM-00002`
  - `SIM-00003`
  - `SIM-00004`
  - `SIM-00005`

- Simulator generates telemetry every 5 seconds.
- Generated telemetry includes:
  - Engine temperature
  - Battery level
  - Vibration
  - Mileage
  - Fault code
  - Timestamp
  - Vehicle ID

### Anomaly Simulation

- Added controlled anomaly generation.
- Simulator occasionally generates:
  - High engine temperature
  - High vibration
  - Low battery
  - Critical fault conditions

- Added critical fault codes:

  - `P0217` — engine over-temperature
  - `P0300` — random/multiple cylinder misfire

### Kafka

- Added `vehicle-telemetry` Kafka topic.
- Simulator publishes telemetry directly to Kafka.
- Spring Boot telemetry service consumes telemetry events.
- Added Kafka producer configuration.
- Added Kafka consumer configuration.
- Added Kafka topic configuration.

Telemetry pipeline:

`Vehicle Simulator → Kafka → Telemetry Service → PostgreSQL`

### Telemetry Persistence

- Added telemetry entity and repository.
- Added telemetry ingestion service.
- Added Kafka telemetry consumer.
- Added duplicate-event protection.
- Telemetry events are persisted using vehicle ID and event timestamp.
- Added telemetry history endpoint for vehicles.
- Added REST telemetry publishing endpoint.

### Verification

- Verified simulator telemetry is continuously published.
- Verified Spring Boot consumes Kafka events.
- Verified telemetry records are stored in PostgreSQL.
- Verified telemetry history can be retrieved through the REST API.
- Verified critical fault events such as `P0300` are persisted.

---

## Phase 3 — Risk Scoring

### FastAPI Risk Service

- Implemented the FastAPI risk scoring service.
- Added health endpoint.
- Added risk scoring endpoint:

  `POST /score`

- Added request and response models.
- Added rule-based risk evaluation.

### Risk Levels

Implemented three risk levels:

- `LOW` — normal telemetry
- `MEDIUM` — warning conditions
- `HIGH` — critical conditions

### HIGH Risk Rules

Telemetry is classified as HIGH when one or more of the following occur:

- Engine temperature > 105°C
- Vibration > 8
- Critical fault code detected:
  - `P0217`
  - `P0300`

The response includes the reason or reasons that triggered the HIGH result.

### MEDIUM Risk Rules

Telemetry is classified as MEDIUM when no HIGH condition exists and one
or more of the following occur:

- Engine temperature > 90°C
- Battery level < 25%
- Mileage > 80,000 km

### LOW Risk

Telemetry is classified as LOW when no HIGH or MEDIUM conditions are present.

### Tests

- Added risk rule unit tests.
- Added FastAPI endpoint tests.
- Verified LOW risk scenarios.
- Verified MEDIUM risk scenarios.
- Verified HIGH risk scenarios.
- Verified critical fault-code handling.
- Verified multiple risk reasons.
- Verified request validation.
- All 12 risk-service pytest tests are passing.

---

## Dashboard Improvements

### Authentication

- Added dashboard login flow.
- Added JWT handling.
- Added sign-out functionality.
- Dashboard communicates with protected Spring Boot APIs.

### Fleet Dashboard

- Added Connected Vehicle dashboard layout.
- Added Fleet Monitoring section.
- Added Vehicle Health Overview.
- Added total vehicle count.
- Added telemetry-service health indicator.
- Added system operational status.
- Added fleet overview table.

Fleet table displays:

- VIN
- Vehicle
- Year
- Registration date

### Simulator Integration

- Dashboard successfully displays the 5 simulator-created vehicles.
- Vehicle count updates from the backend API.
- Fleet data is loaded from the telemetry service.

---

## Infrastructure and Fixes

### Docker

- Verified all services communicate through Docker Compose.
- Added vehicle simulator container.
- Connected simulator to Kafka and telemetry service.
- Configured service startup dependencies.
- Verified telemetry service health checks.
- Verified risk service health checks.
- Verified dashboard container.

### Kafka

- Fixed Kafka KRaft cluster startup/configuration issues.
- Verified Kafka topic communication.
- Verified simulator → Kafka → telemetry-service flow.

### CORS

- Fixed frontend/backend CORS configuration.
- Allowed the dashboard to access the telemetry service from:

  `http://localhost:5173`

- Fixed browser access to `/actuator/health`.
- Verified dashboard health status after refresh.

### Dashboard Build

- Fixed dashboard Docker/CSS build issues.
- Verified the React dashboard runs correctly through Docker.

---

## Current Architecture

`Vehicle Simulator`
↓
`Kafka — vehicle-telemetry`
↓
`Spring Boot Telemetry Service`
↓
`PostgreSQL`

Risk scoring currently runs as a separate FastAPI service:

`Telemetry → Risk Service /score → LOW | MEDIUM | HIGH`

The integration between the telemetry consumer and risk service will be
implemented in Phase 4.

---

## Current State

Working:

- Docker-based local environment
- PostgreSQL
- Kafka
- Kafka UI
- Spring Boot telemetry service
- JWT authentication
- Vehicle management
- Vehicle simulator
- Kafka telemetry publishing
- Kafka telemetry consumption
- Telemetry persistence
- Telemetry history API
- FastAPI risk scoring
- Risk rules
- Risk API tests
- React dashboard
- Fleet overview
- Backend health monitoring
- CORS configuration

Not yet implemented:

- Automatic risk scoring during telemetry ingestion
- Persisting risk level into telemetry records
- Maintenance ticket creation
- Maintenance alerts Kafka topic flow
- Complete role-based endpoint enforcement
- Telemetry history dashboard
- Maintenance ticket dashboard

---

## Next — Phase 4

Phase 4 will connect the existing telemetry pipeline with the risk service.

Target flow:

`Simulator`
→ `Kafka`
→ `Telemetry Consumer`
→ `Persist Telemetry`
→ `Risk Service`
→ `Store Risk Result`
→ `HIGH Risk`
→ `Create Maintenance Ticket`
→ `Publish Maintenance Alert`

Phase 4 goals:

- Call the FastAPI `/score` endpoint after telemetry ingestion.
- Store `riskLevel` and `scoredAt` on telemetry records.
- Add maintenance ticket persistence.
- Automatically create tickets for HIGH-risk events.
- Ensure ticket creation is idempotent.
- Add `maintenance-alerts` Kafka topic.
- Publish alerts for newly created high-risk maintenance tickets.