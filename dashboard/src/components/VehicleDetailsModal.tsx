import { useEffect, useState } from "react";

import {
  Vehicle,
  Telemetry,
  getTelemetryHistory,
} from "../services/api";

interface Props {
  vehicle: Vehicle;
  latestTelemetry: Telemetry | null;
  token: string;
  onClose: () => void;
}

export default function VehicleDetailsModal({
  vehicle,
  latestTelemetry,
  token,
  onClose,
}: Props) {
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError("");

        const data = await getTelemetryHistory(
          vehicle.id,
          token
        );

        const latest = [...data]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          )
          .slice(0, 20);

        setHistory(latest);
      } catch (error) {
        console.error(
          "Telemetry history load failed:",
          error
        );

        setError("Unable to load telemetry history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [vehicle.id, token]);

  const risk =
    latestTelemetry?.riskLevel?.toUpperCase() ??
    "UNKNOWN";

  return (
    <div
      className="modalBackdrop"
      onClick={onClose}
    >
      <div
        className="vehicleModal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="vehicleModalHeader">
          <div>
            <p className="modalEyebrow">
              VEHICLE DETAILS
            </p>

            <h2>{vehicle.vin}</h2>

            <p>
              {vehicle.make || "Unknown"}{" "}
              {vehicle.model || ""}
              {vehicle.year
                ? ` · ${vehicle.year}`
                : ""}
            </p>
          </div>

          <button
            className="modalCloseButton"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="vehicleModalContent">
          <section>
            <div className="detailSectionHeader">
              <h3>Latest Telemetry</h3>

              {latestTelemetry?.riskLevel && (
                <span
                  className={`riskBadge risk${risk}`}
                >
                  {risk}
                </span>
              )}
            </div>

            {latestTelemetry ? (
              <div className="telemetryDetailGrid">
                <Detail
                  label="Engine Temperature"
                  value={`${latestTelemetry.engineTemperature.toFixed(
                    1
                  )} °C`}
                />

                <Detail
                  label="Battery"
                  value={`${latestTelemetry.batteryLevel.toFixed(
                    1
                  )}%`}
                />

                <Detail
                  label="Vibration"
                  value={latestTelemetry.vibration.toFixed(
                    1
                  )}
                />

                <Detail
                  label="Mileage"
                  value={`${latestTelemetry.mileage.toLocaleString()} km`}
                />

                <Detail
                  label="Fault Code"
                  value={
                    latestTelemetry.faultCode ||
                    "None"
                  }
                />

                <Detail
                  label="Last Update"
                  value={new Date(
                    latestTelemetry.timestamp
                  ).toLocaleString()}
                />
              </div>
            ) : (
              <div className="modalEmptyState">
                No telemetry available.
              </div>
            )}
          </section>

          <section className="telemetryHistorySection">
            <div className="detailSectionHeader">
              <div>
                <h3>Telemetry History</h3>
                <p>
                  Latest 20 readings for this
                  vehicle.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="modalEmptyState">
                Loading telemetry history...
              </div>
            ) : error ? (
              <div className="modalEmptyState">
                {error}
              </div>
            ) : history.length === 0 ? (
              <div className="modalEmptyState">
                No telemetry history available.
              </div>
            ) : (
              <div className="tableWrapper">
                <table className="vehicleTable historyTelemetryTable">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Risk</th>
                      <th>Temp</th>
                      <th>Battery</th>
                      <th>Vibration</th>
                      <th>Mileage</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {new Date(
                            item.timestamp
                          ).toLocaleString()}
                        </td>

                        <td>
                          {item.riskLevel ? (
                            <span
                              className={`riskBadge risk${item.riskLevel}`}
                            >
                              {item.riskLevel}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td>
                          {item.engineTemperature.toFixed(
                            1
                          )}{" "}
                          °C
                        </td>

                        <td>
                          {item.batteryLevel.toFixed(
                            1
                          )}
                          %
                        </td>

                        <td>
                          {item.vibration.toFixed(1)}
                        </td>

                        <td>
                          {item.mileage.toLocaleString()}{" "}
                          km
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="telemetryDetail">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}