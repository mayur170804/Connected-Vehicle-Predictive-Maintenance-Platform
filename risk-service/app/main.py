from fastapi import FastAPI

app = FastAPI(
    title="CVPM Risk Scoring Service",
    description="Stateless rule-based risk scoring for vehicle telemetry.",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict:
    """Liveness/readiness probe. Always cheap, no external dependencies."""
    return {"status": "UP"}


# NOTE: /score endpoint (Phase 3) will accept a TelemetryInput payload and
# return {"riskLevel": "LOW|MEDIUM|HIGH", "reason": "..."} using the
# pure-function rule engine in app/rules.py. Left out of this scaffold
# intentionally so Phase 3 can be reviewed and tested on its own.
