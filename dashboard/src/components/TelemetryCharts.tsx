import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Telemetry } from "../services/api";

interface Props {
  history: Telemetry[];
}

export default function TelemetryCharts({
  history,
}: Props) {
  // History is displayed newest first in the modal.
  // Charts should run oldest -> newest.
  const data = [...history]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() -
        new Date(b.timestamp).getTime()
    )
    .map((item) => ({
      timestamp: new Date(
        item.timestamp
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      temperature: item.engineTemperature,
      battery: item.batteryLevel,
      vibration: item.vibration,
    }));

  if (data.length === 0) {
    return null;
  }

  return (
    <section className="telemetryChartsSection">
      <div className="detailSectionHeader">
        <div>
          <h3>Telemetry Trends</h3>

          <p>
            Recent vehicle readings over time.
          </p>
        </div>
      </div>

      <div className="telemetryChartsGrid">
        <TelemetryChart
          title="Engine Temperature"
          data={data}
          dataKey="temperature"
          unit="°C"
        />

        <TelemetryChart
          title="Battery Level"
          data={data}
          dataKey="battery"
          unit="%"
        />

        <TelemetryChart
          title="Vibration"
          data={data}
          dataKey="vibration"
          unit=""
        />
      </div>
    </section>
  );
}

interface ChartProps {
  title: string;
  data: {
    timestamp: string;
    temperature: number;
    battery: number;
    vibration: number;
  }[];
  dataKey:
    | "temperature"
    | "battery"
    | "vibration";
  unit: string;
}

function TelemetryChart({
  title,
  data,
  dataKey,
  unit,
}: ChartProps) {
  return (
    <div className="telemetryChartCard">
      <h4>{title}</h4>

      <div className="telemetryChart">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -15,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10 }}
              minTickGap={25}
            />

            <YAxis
              tick={{ fontSize: 10 }}
              width={55}
            />

            <Tooltip
              formatter={(value) => [
                `${Number(value).toFixed(1)}${unit}`,
                title,
              ]}
            />

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}