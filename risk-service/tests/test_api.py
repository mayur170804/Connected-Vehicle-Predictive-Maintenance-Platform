from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_score_high_risk():
    response = client.post(
        "/score",
        json={
            "engineTemperature": 110,
            "batteryLevel": 80,
            "vibration": 3,
            "mileage": 40_000,
            "faultCode": None,
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert body["riskLevel"] == "HIGH"
    assert "Engine temperature exceeds 105 C" in body["reasons"]


def test_score_low_risk():
    response = client.post(
        "/score",
        json={
            "engineTemperature": 80,
            "batteryLevel": 80,
            "vibration": 2,
            "mileage": 40_000,
            "faultCode": None,
        },
    )

    assert response.status_code == 200
    assert response.json()["riskLevel"] == "LOW"


def test_score_rejects_invalid_battery_level():
    response = client.post(
        "/score",
        json={
            "engineTemperature": 80,
            "batteryLevel": 120,
            "vibration": 2,
            "mileage": 40_000,
            "faultCode": None,
        },
    )

    assert response.status_code == 422