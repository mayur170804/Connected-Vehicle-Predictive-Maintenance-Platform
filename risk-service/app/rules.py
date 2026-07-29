from app.models import RiskLevel, RiskScoreRequest, RiskScoreResponse


CRITICAL_FAULT_CODES = {
    "P0217",  # engine over-temperature
    "P0300",  # random/multiple cylinder misfire
}


def calculate_risk(data: RiskScoreRequest) -> RiskScoreResponse:
    high_reasons: list[str] = []

    if data.engineTemperature > 105:
        high_reasons.append("Engine temperature exceeds 105 C")

    if data.vibration > 8:
        high_reasons.append("Vibration exceeds 8")

    if data.faultCode and data.faultCode.upper() in CRITICAL_FAULT_CODES:
        high_reasons.append(f"Critical fault code: {data.faultCode}")

    if high_reasons:
        return RiskScoreResponse(
            riskLevel=RiskLevel.HIGH,
            reasons=high_reasons,
        )

    medium_reasons: list[str] = []

    if data.engineTemperature > 90:
        medium_reasons.append("Engine temperature exceeds 90 C")

    if data.batteryLevel < 25:
        medium_reasons.append("Battery level below 25%")

    if data.mileage > 80_000:
        medium_reasons.append("Mileage exceeds 80000 km")

    if medium_reasons:
        return RiskScoreResponse(
            riskLevel=RiskLevel.MEDIUM,
            reasons=medium_reasons,
        )

    return RiskScoreResponse(
        riskLevel=RiskLevel.LOW,
        reasons=[],
    )