import json
import logging
import os
import random
import time
from datetime import datetime, timezone

import requests
from confluent_kafka import Producer


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s vehicle-simulator - %(message)s",
)

log = logging.getLogger("vehicle-simulator")


KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "kafka:9092",
)

API_BASE_URL = os.getenv(
    "API_BASE_URL",
    "http://telemetry-service:8080",
)

INTERVAL_SECONDS = int(
    os.getenv("SIMULATOR_INTERVAL_SECONDS", "5")
)

VEHICLE_COUNT = int(
    os.getenv("SIMULATOR_VEHICLE_COUNT", "5")
)

TOPIC = "vehicle-telemetry"


def login():
    response = requests.post(
        f"{API_BASE_URL}/api/auth/login",
        json={
            "username": "admin",
            "password": "password123",
        },
        timeout=10,
    )

    response.raise_for_status()

    token = response.json()["token"]

    log.info("authenticated successfully")

    return token


def get_vehicles(token):
    response = requests.get(
        f"{API_BASE_URL}/api/vehicles",
        headers={
            "Authorization": f"Bearer {token}"
        },
        timeout=10,
    )

    response.raise_for_status()

    return response.json()


def create_vehicle(token, index):
    payload = {
        "vin": f"SIM-{index:05d}",
        "make": "CVPM",
        "model": f"Simulator-{index}",
        "year": 2026,
    }

    response = requests.post(
        f"{API_BASE_URL}/api/vehicles",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=10,
    )

    response.raise_for_status()

    vehicle = response.json()

    log.info(
        "vehicle_created vehicleId=%s vin=%s",
        vehicle["id"],
        vehicle["vin"],
    )

    return vehicle


def ensure_vehicles(token):
    vehicles = get_vehicles(token)

    simulator_vehicles = [
        vehicle
        for vehicle in vehicles
        if vehicle["vin"].startswith("SIM-")
    ]

    existing_by_vin = {
        vehicle["vin"]: vehicle
        for vehicle in simulator_vehicles
    }

    result = []

    for index in range(1, VEHICLE_COUNT + 1):
        vin = f"SIM-{index:05d}"

        if vin in existing_by_vin:
            result.append(existing_by_vin[vin])

            log.info(
                "vehicle_reused vehicleId=%s vin=%s",
                existing_by_vin[vin]["id"],
                vin,
            )
        else:
            result.append(
                create_vehicle(token, index)
            )

    return result


def generate_telemetry(vehicle):
    # Normal values should remain LOW risk.
    engine_temperature = round(random.uniform(75, 90), 1)
    battery_level = round(random.uniform(45, 100), 1)
    vibration = round(random.uniform(1, 5), 1)
    mileage = round(random.uniform(20_000, 75_000), 1)
    fault_code = None

    # Occasionally inject a MEDIUM or HIGH risk condition.
    if random.random() < 0.08:
        anomaly = random.choice(
            [
                "medium_temperature",
                "high_temperature",
                "vibration",
                "battery",
                "mileage",
                "fault",
            ]
        )

        if anomaly == "medium_temperature":
            # > 90 and <= 105 -> MEDIUM
            engine_temperature = round(
                random.uniform(90.1, 105),
                1,
            )

        elif anomaly == "high_temperature":
            # > 105 -> HIGH
            engine_temperature = round(
                random.uniform(105.1, 125),
                1,
            )

        elif anomaly == "vibration":
            # > 8 -> HIGH
            vibration = round(
                random.uniform(8.1, 12),
                1,
            )

        elif anomaly == "battery":
            # < 25 -> MEDIUM
            battery_level = round(
                random.uniform(5, 24.9),
                1,
            )

        elif anomaly == "mileage":
            # > 80,000 -> MEDIUM
            mileage = round(
                random.uniform(80_001, 120_000),
                1,
            )

        elif anomaly == "fault":
            # Matches CRITICAL_FAULT_CODES in risk-service.
            fault_code = random.choice(
                ["P0217", "P0300"]
            )

    return {
        "vehicleId": vehicle["id"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "engineTemperature": engine_temperature,
        "batteryLevel": battery_level,
        "vibration": vibration,
        "mileage": mileage,
        "faultCode": fault_code,
    }

def delivery_report(err, msg):
    if err is not None:
        log.error(
            "kafka_delivery_failed error=%s",
            err,
        )


def run():
    log.info(
        "starting simulator kafka=%s api=%s",
        KAFKA_BOOTSTRAP_SERVERS,
        API_BASE_URL,
    )

    token = login()

    vehicles = ensure_vehicles(token)

    log.info(
        "simulator_ready vehicles=%d interval=%ds",
        len(vehicles),
        INTERVAL_SECONDS,
    )

    producer = Producer(
        {
            "bootstrap.servers":
                KAFKA_BOOTSTRAP_SERVERS
        }
    )

    while True:
        for vehicle in vehicles:
            event = generate_telemetry(vehicle)

            producer.produce(
                TOPIC,
                key=vehicle["id"],
                value=json.dumps(event),
                callback=delivery_report,
            )

            log.info(
                "telemetry_published vehicleId=%s temp=%s battery=%s vibration=%s mileage=%s faultCode=%s",
                event["vehicleId"],
                event["engineTemperature"],
                event["batteryLevel"],
                event["vibration"],
                event["mileage"],
                event["faultCode"],
            )

        producer.poll(0)

        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    while True:
        try:
            run()
        except Exception:
            log.exception(
                "simulator_start_failed retrying_in=5s"
            )

            time.sleep(5)