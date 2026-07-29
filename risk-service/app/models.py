from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class RiskScoreRequest(BaseModel):
    engineTemperature: float
    batteryLevel: float = Field(ge=0, le=100)
    vibration: float = Field(ge=0)
    mileage: float = Field(ge=0)
    faultCode: str | None = None


class RiskScoreResponse(BaseModel):
    riskLevel: RiskLevel
    reasons: list[str]