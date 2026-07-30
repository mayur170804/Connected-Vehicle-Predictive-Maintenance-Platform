import { useEffect, useMemo, useState } from "react";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

        /*
         * Keep latest 20 readings.
         *
         * We sort newest -> oldest first so we can
         * take the latest 20.
         */
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

        setError(
          "Unable to load telemetry history."
        );
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [vehicle.id, token]);

  /*
   * Charts should run oldest -> newest,
   * so time progresses left to right.
   */
  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .map((item) => ({
        id: item.id,
        timestamp: item.timestamp,

        time: new Date(
          item.timestamp
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),

        engineTemperature:
          item.engineTemperature,

        batteryLevel:
          item.batteryLevel,

        vibration:
          item.vibration,
      }));
  }, [history]);

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
        {/* Header */}

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
          {/* Latest telemetry */}

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

          {/* Telemetry trends */}

          <section className="telemetryTrendsSection">
            <div className="detailSectionHeader">
              <div>
                <h3>Telemetry Trends</h3>

                <p>
                  Recent readings for engine
                  temperature, battery and
                  vibration.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="modalEmptyState">
                Loading telemetry trends...
              </div>
            ) : error ? (
              <div className="modalEmptyState">
                {error}
              </div>
            ) : chartData.length === 0 ? (
              <div className="modalEmptyState">
                No telemetry data available.
              </div>
            ) : (
              <div className="telemetryCharts">
                <TelemetryChart
                  title="Engine Temperature"
                  data={chartData}
                  dataKey="engineTemperature"
                  unit="°C"
                />

                <TelemetryChart
                  title="Battery Level"
                  data={chartData}
                  dataKey="batteryLevel"
                  unit="%"
                />

                <TelemetryChart
                  title="Vibration"
                  data={chartData}
                  dataKey="vibration"
                  unit=""
                />
              </div>
            )}
          </section>

          {/* History */}

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
                          {item.vibration.toFixed(
                            1
                          )}
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

/*
 * Latest telemetry detail card
 */

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

/*
 * Reusable telemetry chart
 */

interface ChartData {
  id: string;
  timestamp: string;
  time: string;
  engineTemperature: number;
  batteryLevel: number;
  vibration: number;
}

function TelemetryChart({
  title,
  data,
  dataKey,
  unit,
}: {
  title: string;
  data: ChartData[];
  dataKey:
    | "engineTemperature"
    | "batteryLevel"
    | "vibration";
  unit: string;
}) {
  return (
    <div className="telemetryChartCard">
      <div className="telemetryChartHeader">
        <h4>{title}</h4>

        <span>
          {data.length} readings
        </span>
      </div>

      <div className="telemetryChart">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 12,
              left: -10,
              bottom: 0,
            }}
          >
            <XAxis
              dataKey="time"
              tick={{
                fontSize: 10,
              }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />

            <YAxis
              tick={{
                fontSize: 10,
              }}
              tickLine={false}
              axisLine={false}
              width={50}
              domain={["auto", "auto"]}
            />

            <Tooltip
              labelFormatter={(
                _label,
                payload
              ) => {
                const timestamp =
                  payload?.[0]?.payload
                    ?.timestamp;

                return timestamp
                  ? new Date(
                      timestamp
                    ).toLocaleString()
                  : "";
              }}
              formatter={(value) => [
                `${Number(value).toFixed(
                  1
                )}${unit}`,
                title,
              ]}
            />

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}