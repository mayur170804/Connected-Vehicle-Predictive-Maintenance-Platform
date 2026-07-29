from fastapi import FastAPI

from app.models import RiskScoreRequest, RiskScoreResponse
from app.rules import calculate_risk


app = FastAPI(
    title="CVPM Risk Scoring Service",
    description="Stateless rule-based risk scoring for vehicle telemetry.",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict:
    """Liveness/readiness probe. Always cheap, no external dependencies."""
    return {"status": "UP"}


@app.post("/score", response_model=RiskScoreResponse)
def score(request: RiskScoreRequest) -> RiskScoreResponse:
    return calculate_risk(request)