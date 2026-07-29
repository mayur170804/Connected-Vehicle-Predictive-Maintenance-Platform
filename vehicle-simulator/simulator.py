"""
Vehicle telemetry simulator (Phase 0 scaffold).

Phase 2 will flesh this out to:
  - maintain N simulated vehicles with realistic drifting state
    (engineTemperature, batteryLevel, vibration, mileage, faultCode)
  - publish JSON telemetry events to the `vehicle-telemetry` Kafka topic
    every SIMULATOR_INTERVAL_SECONDS
  - occasionally inject anomalies so HIGH-risk scoring can be exercised end-to-end

For now this just confirms the container boots, reads its env vars, and
logs a heartbeat -- so `docker compose up` succeeds and the log stream
proves the service is alive before real Kafka logic is added.
"""
import logging
import os
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
log = logging.getLogger("vehicle-simulator")

KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
INTERVAL_SECONDS = int(os.getenv("SIMULATOR_INTERVAL_SECONDS", "5"))
VEHICLE_COUNT = int(os.getenv("SIMULATOR_VEHICLE_COUNT", "5"))


def main() -> None:
    log.info(
        "vehicle-simulator starting (kafka=%s, interval=%ss, vehicles=%s)",
        KAFKA_BOOTSTRAP_SERVERS,
        INTERVAL_SECONDS,
        VEHICLE_COUNT,
    )
    while True:
        log.info("heartbeat - simulator alive, Kafka publishing lands in Phase 2")
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
