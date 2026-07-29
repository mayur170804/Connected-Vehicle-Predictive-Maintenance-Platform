"""
Vehicle telemetry simulator (Phase 2).

Responsibilities:
  1. Wait for telemetry-service to become healthy.
  2. Log in as the seeded "admin" user to get a JWT.
  3. Ensure SIMULATOR_VEHICLE_COUNT vehicles exist (create via REST if
     missing; VIN conflicts are treated as "already exists, reuse it" so
     the simulator is safely restartable).
  4. Maintain simple per-vehicle state that drifts randomly each tick, with
     occasional injected anomalies so HIGH/MEDIUM risk scoring (Phase 3/4)
     has something real to react to.
  5. Publish each tick's telemetry directly to the `vehicle-telemetry` Kafka
     topic as JSON matching the TelemetryEvent contract used by
     telemetry-service (vehicleId, timestamp, engineTemperature,
     batteryLevel, vibration, mileage, faultCode).

This intentionally does NOT go through the REST /api/telemetry endpoint for
the recurring publish loop -- it publishes straight to Kafka, exercising the
same path a real embedded/vehicle-side telemetry agent would use.
"""
import json
import logging
import os
import random
import time
from datetime import datetime, timezone

import requests
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
log = logging.getLogger("vehicle-simulator")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
INTERVAL_SECONDS = int(os.getenv("SIMULATOR_INTERVAL_SECONDS", "5"))
VEHICLE_COUNT = int(os.getenv("SIMULATOR_VEHICLE_COUNT", "5"))
API_BASE_URL = os.getenv("API_BASE_URL", "http://telemetry-service:8080")
TOPIC = "vehicle-telemetry"

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"

CRITICAL_FAULT_CODES = {"P0300"}  # misfire detected -- treated as HIGH risk by the rule engine


def wait_for_api_health():
    while True:
        try:
            resp = requests.get(f"{API_BASE_URL}/actuator/health", timeout=5)
            if resp.status_code == 200 and resp.json().get("status") == "UP":
                log.info("telemetry-service is healthy")
                return
        except requests.RequestException:
            pass
        log.info("waiting for telemetry-service to become healthy...")
        time.sleep(3)


def login() -> str:
    resp = requests.post(
        f"{API_BASE_URL}/api/auth/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=5,
    )
    resp.raise_for_status()
    return resp.json()["token"]


def ensure_vehicles(token: str) -> list[dict]:
    """Create SIMULATOR_VEHICLE_COUNT vehicles with deterministic VINs.
    Reuses existing ones on restart instead of erroring on VIN conflict."""
    headers = {"Authorization": f"Bearer {token}"}

    existing = requests.get(f"{API_BASE_URL}/api/vehicles", headers=headers, timeout=5)
    existing.raise_for_status()
    by_vin = {v["vin"]: v for v in existing.json()}

    vehicles = []
    makes_models = [("Honda", "Accord"), ("Toyota", "Camry"), ("Ford", "F-150"),
                     ("Tesla", "Model 3"), ("Chevrolet", "Bolt")]
    for i in range(VEHICLE_COUNT):
        vin = f"SIMVIN{i:010d}"
        if vin in by_vin:
            vehicles.append(by_vin[vin])
            continue
        make, model = makes_models[i % len(makes_models)]
        payload = {"vin": vin, "make": make, "model": model, "year": 2020 + (i % 5)}
        resp = requests.post(f"{API_BASE_URL}/api/vehicles", json=payload, headers=headers, timeout=5)
        if resp.status_code == 201:
            vehicles.append(resp.json())
            log.info("created vehicle vin=%s id=%s", vin, resp.json()["id"])
        elif resp.status_code == 409:
            # Raced with another restart, or seed data already present; fetch it.
            existing2 = requests.get(f"{API_BASE_URL}/api/vehicles", headers=headers, timeout=5)
            existing2.raise_for_status()
            match = next(v for v in existing2.json() if v["vin"] == vin)
            vehicles.append(match)
        else:
            resp.raise_for_status()
    return vehicles


class VehicleState:
    """Simple random-walk state per vehicle, with occasional anomaly injection."""

    def __init__(self, vehicle_id: str):
        self.vehicle_id = vehicle_id
        self.engine_temperature = random.uniform(75, 90)
        self.battery_level = random.uniform(60, 100)
        self.vibration = random.uniform(1, 4)
        self.mileage = random.uniform(5_000, 90_000)

    def tick(self) -> dict:
        # Normal drift
        self.engine_temperature += random.uniform(-2, 2)
        self.battery_level += random.uniform(-1, 0.5)
        self.vibration += random.uniform(-0.5, 0.5)
        self.mileage += random.uniform(0, 5)

        # Occasional anomaly injection (~8% of ticks) to exercise MEDIUM/HIGH scoring.
        fault_code = None
        if random.random() < 0.08:
            anomaly = random.choice(["overheat", "high_vibration", "low_battery", "fault_code"])
            if anomaly == "overheat":
                self.engine_temperature = random.uniform(100, 115)
            elif anomaly == "high_vibration":
                self.vibration = random.uniform(7, 10)
            elif anomaly == "low_battery":
                self.battery_level = random.uniform(5, 24)
            elif anomaly == "fault_code":
                fault_code = random.choice(list(CRITICAL_FAULT_CODES))

        # Clamp to realistic bounds
        self.engine_temperature = max(60, min(self.engine_temperature, 130))
        self.battery_level = max(0, min(self.battery_level, 100))
        self.vibration = max(0, min(self.vibration, 12))

        return {
            "vehicleId": self.vehicle_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "engineTemperature": round(self.engine_temperature, 2),
            "batteryLevel": round(self.battery_level, 2),
            "vibration": round(self.vibration, 2),
            "mileage": round(self.mileage, 2),
            "faultCode": fault_code,
        }


def connect_kafka_producer() -> KafkaProducer:
    while True:
        try:
            return KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8"),
            )
        except NoBrokersAvailable:
            log.info("waiting for Kafka to become available...")
            time.sleep(3)


def main() -> None:
    wait_for_api_health()
    token = login()
    vehicles = ensure_vehicles(token)
    log.info("simulating %d vehicles, publishing every %ss", len(vehicles), INTERVAL_SECONDS)

    states = [VehicleState(v["id"]) for v in vehicles]
    producer = connect_kafka_producer()

    while True:
        for state in states:
            event = state.tick()
            producer.send(TOPIC, key=state.vehicle_id, value=event)
            log.info("published vehicleId=%s temp=%.1f battery=%.1f vibration=%.1f fault=%s",
                      state.vehicle_id, event["engineTemperature"], event["batteryLevel"],
                      event["vibration"], event["faultCode"])
        producer.flush()
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
