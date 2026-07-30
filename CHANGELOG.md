# Development Changelog

## 30 July 2026

### Status

Phases 0–4 completed.

The platform now supports vehicle management, JWT authentication,
simulated telemetry generation, Kafka-based telemetry ingestion,
PostgreSQL persistence, automatic risk scoring, persisted risk results,
and an initial fleet dashboard.

Phase 4 completed the integration between the Spring Boot telemetry service
and the FastAPI risk scoring service.

Telemetry events are now automatically scored after ingestion, and the
resulting risk level is persisted with the telemetry record.

---

## Phase 4 — Risk Scoring Integration

### Telemetry and Risk Integration

- Integrated the Spring Boot telemetry service with the FastAPI risk service.
- Added automatic risk scoring during telemetry ingestion.
- Telemetry events are first persisted before risk evaluation.
- Added communication from the telemetry service to:

  `POST /score`

- Telemetry values are sent to the risk service for evaluation.
- Risk service returns:
    - Risk level
    - Risk reasons

Integrated processing flow:

`Vehicle Simulator`
→ `Kafka`
→ `Telemetry Consumer`
→ `Persist Telemetry`
→ `Risk Service`
→ `Store Risk Result`

### Risk Result Persistence

- Added risk information to persisted telemetry records.
- Added `riskLevel` persistence.
- Added `scoredAt` timestamp persistence.
- Risk results are stored after successful scoring.
- Verified LOW-risk results are persisted.
- Verified HIGH-risk telemetry can be submitted manually for testing.

Telemetry records now contain:

- Vehicle ID
- Event timestamp
- Engine temperature
- Battery level
- Vibration
- Mileage
- Fault code
- Risk level
- Risk scoring timestamp

### Kafka Consumer Integration

- Updated the telemetry Kafka consumer to trigger risk scoring after
  telemetry ingestion.
- Added logging around the complete telemetry processing lifecycle.
- Verified telemetry events are consumed from the `vehicle-telemetry` topic.
- Verified persisted telemetry is passed to the risk service.
- Verified successful risk responses are saved to PostgreSQL.

Example processing lifecycle:

`telemetry_persisted`
→ `POST /score`
→ `telemetry_risk_saved`
→ `telemetry_scored`

### Duplicate and Concurrent Event Handling

- Maintained duplicate telemetry protection using:
    - Vehicle ID
    - Event timestamp
- Added handling for concurrent duplicate inserts.
- Database constraint violations caused by concurrent ingestion are resolved
  by retrieving the already persisted telemetry record.
- Prevented duplicate telemetry records from being created during ingestion.

### Testing

- Updated telemetry ingestion unit tests for the integrated ingestion flow.
- Verified new telemetry persistence.
- Verified existing telemetry is not inserted again.
- Verified telemetry from unknown vehicles is rejected.
- Verified concurrent duplicate insertion handling.
- Verified Maven tests and application build successfully.

### End-to-End Verification

Verified the complete processing pipeline using the vehicle simulator:

`Simulator`
→ `Kafka`
→ `Telemetry Service`
→ `PostgreSQL`
→ `Risk Service`
→ `Risk Result Persistence`

Observed successful runtime events including:

- `telemetry_persisted`
- `telemetry_risk_saved`
- `telemetry_scored`
- Successful `POST /score` responses from the risk service.

### Manual Telemetry Testing

- Verified telemetry can also be manually published through Kafka UI.
- Used an existing vehicle ID to inject custom telemetry.
- Added the ability to test abnormal telemetry values independently of
  simulator-generated events.
- Verified manually produced Kafka events enter the same processing pipeline
  as simulator events.

This allows controlled testing of:

- High engine temperature
- Low battery
- High vibration
- Critical fault codes
- LOW, MEDIUM, and HIGH risk scenarios

### PostgreSQL Administration

- Added pgAdmin to the Docker Compose environment.
- Connected pgAdmin to the PostgreSQL container.
- PostgreSQL data can now be inspected through a browser-based interface.
- Telemetry records and persisted risk results can be inspected directly.
- Existing PostgreSQL persistent volume remains in use.

### Infrastructure

The local Docker environment now includes:

- PostgreSQL
- pgAdmin
- Kafka
- Kafka UI
- Spring Boot telemetry service
- FastAPI risk service
- Vehicle simulator
- React dashboard

Verified all required application services start successfully and the core
services report healthy status.

---

## Current Architecture

The current end-to-end telemetry flow is:

`Vehicle Simulator`
↓
`Kafka — vehicle-telemetry`
↓
`Spring Boot Telemetry Consumer`
↓
`Telemetry Ingest Service`
↓
`PostgreSQL`
↓
`FastAPI Risk Service — /score`
↓
`Risk Level + Reasons`
↓
`Persist Risk Result`

Telemetry records are therefore automatically processed from ingestion
through risk evaluation without requiring a manual risk-service request.

The React dashboard communicates with the protected Spring Boot APIs using
JWT authentication.

Development infrastructure also provides:

`Kafka UI → Kafka inspection`

`pgAdmin → PostgreSQL inspection`

---

## Current State

Working:

- Docker-based local environment
- PostgreSQL persistence
- pgAdmin database administration
- Kafka
- Kafka UI
- `vehicle-telemetry` Kafka topic
- Spring Boot telemetry service
- FastAPI risk service
- JWT authentication
- ADMIN and OPERATOR roles
- Vehicle management
- Vehicle simulator
- Kafka telemetry publishing
- Kafka telemetry consumption
- Telemetry persistence
- Duplicate telemetry protection
- Concurrent duplicate handling
- Telemetry history API
- Automatic risk scoring
- LOW / MEDIUM / HIGH risk classification
- Risk reason generation
- Risk level persistence
- Risk scoring timestamp persistence
- Manual Kafka telemetry testing
- React dashboard
- Fleet overview
- Backend health monitoring
- CORS configuration
- Risk-service tests
- Telemetry-service tests
- End-to-end telemetry/risk pipeline

Not yet implemented:

- Maintenance ticket persistence
- Automatic maintenance ticket creation for HIGH-risk events
- Idempotent maintenance ticket generation
- `maintenance-alerts` Kafka topic
- Maintenance alert publishing
- Maintenance ticket REST APIs
- Maintenance ticket dashboard
- Telemetry history visualization
- Risk status on the fleet dashboard
- Complete role-based endpoint enforcement

---

## Next — Phase 5

Phase 5 will build the predictive maintenance workflow on top of the
completed telemetry and risk-scoring pipeline.

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
→ `Dashboard`

Phase 5 goals:

- Add maintenance ticket entity and persistence.
- Automatically create maintenance tickets for HIGH-risk telemetry.
- Ensure maintenance ticket creation is idempotent.
- Add maintenance ticket lifecycle/status.
- Add `maintenance-alerts` Kafka topic.
- Publish an alert when a new HIGH-risk maintenance ticket is created.
- Add maintenance ticket REST APIs.
- Display vehicle risk status on the fleet dashboard.
- Add telemetry history visualization.
- Add maintenance alerts/tickets to the dashboard.
- Verify the complete predictive maintenance workflow end to end.