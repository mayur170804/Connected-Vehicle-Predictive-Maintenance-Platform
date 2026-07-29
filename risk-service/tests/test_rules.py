from app.models import RiskLevel, RiskScoreRequest
from app.rules import calculate_risk


def make_request(**overrides):
    data = {
        "engineTemperature": 80,
        "batteryLevel": 80,
        "vibration": 2,
        "mileage": 40_000,
        "faultCode": None,
    }
    data.update(overrides)
    return RiskScoreRequest(**data)


def test_low_risk():
    result = calculate_risk(make_request())

    assert result.riskLevel == RiskLevel.LOW
    assert result.reasons == []


def test_high_risk_engine_temperature():
    result = calculate_risk(
        make_request(engineTemperature=106)
    )

    assert result.riskLevel == RiskLevel.HIGH


def test_high_risk_vibration():
    result = calculate_risk(
        make_request(vibration=8.1)
    )

    assert result.riskLevel == RiskLevel.HIGH


def test_high_risk_critical_fault_code():
    result = calculate_risk(
        make_request(faultCode="P0217")
    )

    assert result.riskLevel == RiskLevel.HIGH


def test_medium_risk_engine_temperature():
    result = calculate_risk(
        make_request(engineTemperature=95)
    )

    assert result.riskLevel == RiskLevel.MEDIUM


def test_medium_risk_low_battery():
    result = calculate_risk(
        make_request(batteryLevel=20)
    )

    assert result.riskLevel == RiskLevel.MEDIUM


def test_medium_risk_high_mileage():
    result = calculate_risk(
        make_request(mileage=80_001)
    )

    assert result.riskLevel == RiskLevel.MEDIUM


def test_high_takes_precedence_over_medium():
    result = calculate_risk(
        make_request(
            engineTemperature=110,
            batteryLevel=10,
            mileage=100_000,
        )
    )

    assert result.riskLevel == RiskLevel.HIGH