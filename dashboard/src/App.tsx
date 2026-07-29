import { useEffect, useState } from "react";

// Phase 0: just prove the dashboard container boots and can reach the
// telemetry-service health endpoint. Phase 6 replaces this with the real
// Vehicles / Telemetry / Tickets pages + router + auth.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export default function App() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch(`${API_BASE_URL}/actuator/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status ?? "unknown"))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Connected Vehicle Predictive Maintenance Platform</h1>
      <p>Dashboard scaffold — Phase 0.</p>
      <p>
        Telemetry service health: <strong>{status}</strong>
      </p>
    </div>
  );
}
