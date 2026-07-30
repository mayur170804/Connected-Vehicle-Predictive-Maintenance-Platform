import { useEffect, useState } from "react";

import Header from "./components/Header";
import Login from "./components/Login";
import StatCard from "./components/StatCard";

import {
  getVehicles,
  getLatestTelemetry,
  login,
  Vehicle,
  Telemetry,
} from "./services/api";

import "./styles/app.css";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";


export default function App() {
  const [status, setStatus] = useState("checking...");
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem("cvpm_token")
  );

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState("");
  const [telemetryByVehicle, setTelemetryByVehicle] =
    useState<Record<string, Telemetry | null>>({});


  useEffect(() => {
    fetch(`${API_BASE_URL}/actuator/health`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Health check failed");
        }

        return res.json();
      })
      .then((data) => setStatus(data.status ?? "unknown"))
      .catch(() => setStatus("unreachable"));
  }, []);


  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = token;

    async function loadFleet() {
      setVehiclesLoading(true);
      setVehiclesError("");

      try {
        const vehicleData = await getVehicles(authToken);

        setVehicles(vehicleData);

        const telemetryEntries = await Promise.all(
          vehicleData.map(async (vehicle) => {
            try {
              const telemetry = await getLatestTelemetry(
                vehicle.id,
                authToken
              );

              return [vehicle.id, telemetry] as const;
            } catch {
              return [vehicle.id, null] as const;
            }
          })
        );

        setTelemetryByVehicle(
          Object.fromEntries(telemetryEntries)
        );
      } catch {
        setVehiclesError("Unable to load vehicles.");
      } finally {
        setVehiclesLoading(false);
      }
    }

    loadFleet();
  }, [token]);

useEffect(() => {
  if (!token || vehicles.length === 0) {
    return;
  }

  const authToken = token;

  async function refreshTelemetry() {
    console.log("Polling telemetry...");

    const telemetryEntries = await Promise.all(
      vehicles.map(async (vehicle) => {
        try {
          const telemetry = await getLatestTelemetry(
            vehicle.id,
            authToken
          );

          console.log(
            "LATEST",
            vehicle.vin,
            telemetry?.timestamp,
            telemetry?.engineTemperature,
            telemetry?.riskLevel
          );

          return [vehicle.id, telemetry] as const;
        } catch (error) {
          console.error(
            "Telemetry refresh failed:",
            vehicle.id,
            error
          );

          return [vehicle.id, null] as const;
        }
      })
    );

    const nextTelemetry = Object.fromEntries(telemetryEntries);

    console.log("Updating React state:", nextTelemetry);

    setTelemetryByVehicle(nextTelemetry);
  }

  const intervalId = window.setInterval(
    refreshTelemetry,
    5000
  );

  return () => {
    window.clearInterval(intervalId);
  };
}, [token, vehicles]);


  async function handleLogin(username: string, password: string) {
    const result = await login(username, password);

    sessionStorage.setItem("cvpm_token", result.token);
    setToken(result.token);
  }


  function handleLogout() {
    sessionStorage.removeItem("cvpm_token");

    setToken(null);
    setVehicles([]);
    setTelemetryByVehicle({});
  }


  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

const highRiskCount = Object.values(telemetryByVehicle).filter(
  (telemetry) => telemetry?.riskLevel === "HIGH"
).length;


  return (
    <div className="app">
      <Header serviceStatus={status} />

      <main className="content">
        <section className="hero">
          <div>
            <p className="eyebrow">FLEET MONITORING</p>
            <h2>Vehicle Health Overview</h2>

            <p>
              Monitor vehicle telemetry, maintenance risk and service
              requirements from one dashboard.
            </p>
          </div>

          <button className="logoutButton" onClick={handleLogout}>
            Sign out
          </button>
        </section>


        <section className="statsGrid">
          <StatCard
            label="Total Vehicles"
            value={vehiclesLoading ? "..." : vehicles.length}
            description="Registered fleet"
          />

          <StatCard
            label="High Risk"
            value={vehiclesLoading ? "..." : highRiskCount}
            description="Requires attention"
          />

          <StatCard
            label="Open Tickets"
            value="--"
            description="Maintenance required"
          />

          <StatCard
            label="Telemetry Service"
            value={status === "UP" ? "Online" : "Offline"}
            description="Backend status"
          />
        </section>


        <section className="panel">
          <div className="panelHeader">
            <div>
              <h3>Fleet Overview</h3>
              <p>Registered vehicles in the connected fleet.</p>
            </div>
          </div>


          {vehiclesLoading && (
            <div className="emptyState">
              <p>Loading vehicles...</p>
            </div>
          )}


          {vehiclesError && (
            <div className="emptyState">
              <h3>Unable to load fleet</h3>
              <p>{vehiclesError}</p>
            </div>
          )}


          {!vehiclesLoading &&
            !vehiclesError &&
            vehicles.length === 0 && (
              <div className="emptyState">
                <div className="emptyIcon">CV</div>
                <h3>No vehicles registered</h3>
                <p>
                  Vehicles will appear here when they are registered.
                </p>
              </div>
            )}


          {!vehiclesLoading &&
            !vehiclesError &&
            vehicles.length > 0 && (
              <div className="tableWrapper">
                <table className="vehicleTable">
                  <thead>
                    <tr>
                      <th>VIN</th>
                      <th>Vehicle</th>
                      <th>Year</th>
                      <th>Risk</th>
                      <th>Temperature</th>
                      <th>Battery</th>
                      <th>Vibration</th>
                      <th>Last Update</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vehicles.map((vehicle) => {
                      const telemetry = telemetryByVehicle[vehicle.id];

                      return (
                        <tr key={vehicle.id}>
                          <td className="vin">
                            {vehicle.vin}
                          </td>

                          <td>
                            {vehicle.make || "—"}{" "}
                            {vehicle.model || ""}
                          </td>

                          <td>
                            {vehicle.year ?? "—"}
                          </td>

                          <td>
                            {telemetry?.riskLevel ?? "—"}
                          </td>

                          <td>
                            {telemetry
                              ? `${telemetry.engineTemperature.toFixed(1)} °C`
                              : "—"}
                          </td>

                          <td>
                            {telemetry
                              ? `${telemetry.batteryLevel.toFixed(1)}%`
                              : "—"}
                          </td>

                          <td>
                            {telemetry
                              ? telemetry.vibration.toFixed(1)
                              : "—"}
                          </td>

                          <td>
                            {telemetry
                              ? new Date(telemetry.timestamp).toLocaleString()
                              : "No telemetry"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </main>
    </div>
  );
}