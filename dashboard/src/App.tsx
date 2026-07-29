import { useEffect, useState } from "react";

import Header from "./components/Header";
import Login from "./components/Login";
import StatCard from "./components/StatCard";

import {
  getVehicles,
  login,
  Vehicle,
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

    setVehiclesLoading(true);
    setVehiclesError("");

    getVehicles(token)
      .then(setVehicles)
      .catch(() => {
        setVehiclesError("Unable to load vehicles.");
      })
      .finally(() => {
        setVehiclesLoading(false);
      });
  }, [token]);


  async function handleLogin(username: string, password: string) {
    const result = await login(username, password);

    sessionStorage.setItem("cvpm_token", result.token);
    setToken(result.token);
  }


  function handleLogout() {
    sessionStorage.removeItem("cvpm_token");

    setToken(null);
    setVehicles([]);
  }


  if (!token) {
    return <Login onLogin={handleLogin} />;
  }


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
            value="--"
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
                      <th>Registered</th>
                    </tr>
                  </thead>

                  <tbody>
                    {vehicles.map((vehicle) => (
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
                          {new Date(
                            vehicle.createdAt
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </main>
    </div>
  );
}