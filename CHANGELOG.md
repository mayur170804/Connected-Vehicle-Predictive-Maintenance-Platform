# Development Changelog

## 30 July 2026

### Status

Phases 0–5 completed.

Phase 5 completed the predictive maintenance workflow and dashboard integration.

---

## Phase 5 — Predictive Maintenance

### Maintenance Tickets

- Added maintenance ticket persistence.
- Added automatic maintenance ticket creation for HIGH-risk telemetry.
- Added idempotent ticket generation to prevent duplicate tickets.
- Added maintenance ticket lifecycle:
    - `OPEN`
    - `RESOLVED`
- Added API to retrieve maintenance tickets.
- Added API to resolve maintenance tickets.
- Resolved tickets remain stored for history.

### Dashboard

- Added maintenance tickets to the React dashboard.
- Added open maintenance ticket count.
- Added Resolve action for open tickets.
- Added Ticket History for resolved tickets.
- Displays the latest 10 resolved tickets.
- Added LOW, MEDIUM, and HIGH risk status to Fleet Overview.
- Added highlighting for HIGH-risk vehicles.
- Dashboard refreshes telemetry and maintenance tickets every 5 seconds.

### Vehicle Details

- Added clickable vehicle rows.
- Added Vehicle Details modal.
- Displays latest vehicle telemetry:
    - Engine temperature
    - Battery level
    - Vibration
    - Mileage
    - Fault code
    - Risk level
- Added telemetry history using:

  `GET /api/vehicles/{vehicleId}/telemetry`

- Displays the latest 20 telemetry readings.

### End-to-End Flow

Current predictive maintenance flow:

`Vehicle Simulator`
→ `Kafka`
→ `Telemetry Service`
→ `PostgreSQL`
→ `Risk Service`
→ `Risk Result`
→ `HIGH Risk`
→ `Maintenance Ticket`
→ `Dashboard`

### Verification

- Verified telemetry generation and Kafka ingestion.
- Verified LOW, MEDIUM, and HIGH risk scoring.
- Verified maintenance ticket creation for HIGH-risk events.
- Verified ticket resolution from the dashboard.
- Verified resolved ticket history.
- Verified vehicle telemetry history.
- Verified the updated system using Docker.

---

## Current State

Working:

- Vehicle telemetry generation
- Kafka telemetry ingestion
- PostgreSQL persistence
- Automatic risk scoring
- LOW / MEDIUM / HIGH risk classification
- Maintenance ticket generation
- Maintenance ticket persistence
- Ticket resolution
- Ticket history
- Fleet risk status
- Vehicle Details modal
- Telemetry history
- Live dashboard updates
- JWT authentication
- Docker-based local environment

---

## Next — Phase 6

Phase 6 will focus on improving analytics and production readiness.

Possible goals:

- Telemetry charts and trends
- Better maintenance history filtering
- Complete role-based authorization
- Improved error handling
- Additional automated tests
- Monitoring and observability
- Production deployment preparation