import { useEffect, useState } from "react";

import Header from "./components/Header";
import Login from "./components/Login";
import StatCard from "./components/StatCard";

import {
  getVehicles,
  getLatestTelemetry,
  getMaintenanceTickets,
  login,
  Vehicle,
  Telemetry,
  MaintenanceTicket,
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

  const [maintenanceTickets, setMaintenanceTickets] =
    useState<MaintenanceTicket[]>([]);

  /*
   * Backend health
   */
  useEffect(() => {
    fetch(`${API_BASE_URL}/actuator/health`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Health check failed");
        }

        return res.json();
      })
      .then((data) => {
        setStatus(data.status ?? "unknown");
      })
      .catch(() => {
        setStatus("unreachable");
      });
  }, []);

  /*
   * Initial fleet load
   */
  useEffect(() => {
    if (!token) {
      return;
    }

    const authToken = token;

    async function loadFleet() {
      setVehiclesLoading(true);
      setVehiclesError("");

      try {
        // 1. Load vehicles
        const vehicleData = await getVehicles(authToken);
        setVehicles(vehicleData);

        // 2. Load maintenance tickets independently
        try {
          const ticketData =
            await getMaintenanceTickets(authToken);

          setMaintenanceTickets(ticketData);

          console.log(
            "Initial maintenance tickets:",
            ticketData
          );
        } catch (error) {
          console.error(
            "Initial maintenance ticket load failed:",
            error
          );

          setMaintenanceTickets([]);
        }

        // 3. Load latest telemetry
        const telemetryEntries = await Promise.all(
          vehicleData.map(async (vehicle) => {
            try {
              const telemetry =
                await getLatestTelemetry(
                  vehicle.id,
                  authToken
                );

              return [
                vehicle.id,
                telemetry,
              ] as const;
            } catch (error) {
              console.error(
                "Initial telemetry load failed:",
                vehicle.id,
                error
              );

              return [
                vehicle.id,
                null,
              ] as const;
            }
          })
        );

        setTelemetryByVehicle(
          Object.fromEntries(telemetryEntries)
        );
      } catch (error) {
        console.error(
          "Vehicle load failed:",
          error
        );

        setVehiclesError(
          error instanceof Error
            ? error.message
            : "Unable to load vehicles."
        );
      } finally {
        setVehiclesLoading(false);
      }
    }

    loadFleet();
  }, [token]);

  /*
   * Live dashboard polling
   *
   * Refresh:
   * - latest telemetry
   * - maintenance tickets
   *
   * every 5 seconds
   */
  useEffect(() => {
    if (!token || vehicles.length === 0) {
      return;
    }

    const authToken = token;

    async function refreshDashboard() {
      console.log("Refreshing dashboard...");

      /*
       * Refresh telemetry
       */
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

      const nextTelemetry =
        Object.fromEntries(telemetryEntries);

      setTelemetryByVehicle(nextTelemetry);

      /*
       * Refresh maintenance tickets
       */
      try {
        const ticketData =
          await getMaintenanceTickets(authToken);

        console.log(
          "Maintenance tickets:",
          ticketData
        );

        setMaintenanceTickets(ticketData);
      } catch (error) {
        console.error(
          "Maintenance ticket refresh failed:",
          error
        );
      }
    }

    /*
     * Refresh immediately
     */
    refreshDashboard();

    /*
     * Then refresh every 5 seconds
     */
    const intervalId = window.setInterval(
      refreshDashboard,
      5000
    );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [token, vehicles]);

  /*
   * Login
   */
  async function handleLogin(
    username: string,
    password: string
  ) {
    const result = await login(username, password);

    sessionStorage.setItem(
      "cvpm_token",
      result.token
    );

    setToken(result.token);
  }

  /*
   * Logout
   */
  function handleLogout() {
    sessionStorage.removeItem("cvpm_token");

    setToken(null);
    setVehicles([]);
    setTelemetryByVehicle({});
    setMaintenanceTickets([]);
  }

  /*
   * Login screen
   */
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  /*
   * Dashboard statistics
   */
  const highRiskCount =
    Object.values(telemetryByVehicle).filter(
      (telemetry) =>
        telemetry?.riskLevel === "HIGH"
    ).length;

  const openTicketCount =
    maintenanceTickets.filter(
      (ticket) =>
        ticket.status?.toUpperCase() === "OPEN"
    ).length;

  return (
    <div className="app">
      <Header serviceStatus={status} />

      <main className="content">

        {/* Hero */}

        <section className="hero">
          <div>
            <p className="eyebrow">
              FLEET MONITORING
            </p>

            <h2>
              Vehicle Health Overview
            </h2>

            <p>
              Monitor vehicle telemetry,
              maintenance risk and service
              requirements from one dashboard.
            </p>
          </div>

          <button
            className="logoutButton"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </section>

        {/* Statistics */}

        <section className="statsGrid">

          <StatCard
            label="Total Vehicles"
            value={
              vehiclesLoading
                ? "..."
                : vehicles.length
            }
            description="Registered fleet"
          />

          <StatCard
            label="High Risk"
            value={
              vehiclesLoading
                ? "..."
                : highRiskCount
            }
            description="Requires attention"
          />

          <StatCard
            label="Open Tickets"
            value={
              vehiclesLoading
                ? "..."
                : openTicketCount
            }
            description="Maintenance required"
          />

          <StatCard
            label="Telemetry Service"
            value={
              status === "UP"
                ? "Online"
                : "Offline"
            }
            description="Backend status"
          />

        </section>

        {/* Fleet */}

        <section className="panel">

          <div className="panelHeader">
            <div>
              <h3>Fleet Overview</h3>

              <p>
                Registered vehicles in the
                connected fleet.
              </p>
            </div>
          </div>

          {/* Loading */}

          {vehiclesLoading && (
            <div className="emptyState">
              <p>Loading vehicles...</p>
            </div>
          )}

          {/* Error */}

          {vehiclesError && (
            <div className="emptyState">
              <h3>Unable to load fleet</h3>
              <p>{vehiclesError}</p>
            </div>
          )}

          {/* Empty */}

          {!vehiclesLoading &&
            !vehiclesError &&
            vehicles.length === 0 && (
              <div className="emptyState">

                <div className="emptyIcon">
                  CV
                </div>

                <h3>
                  No vehicles registered
                </h3>

                <p>
                  Vehicles will appear here
                  when they are registered.
                </p>

              </div>
            )}

          {/* Fleet table */}

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
                      const telemetry =
                        telemetryByVehicle[
                          vehicle.id
                        ];

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
                            {telemetry?.riskLevel ??
                              "—"}
                          </td>

                          <td>
                            {telemetry
                              ? `${telemetry.engineTemperature.toFixed(
                                  1
                                )} °C`
                              : "—"}
                          </td>

                          <td>
                            {telemetry
                              ? `${telemetry.batteryLevel.toFixed(
                                  1
                                )}%`
                              : "—"}
                          </td>

                          <td>
                            {telemetry
                              ? telemetry.vibration.toFixed(
                                  1
                                )
                              : "—"}
                          </td>

                          <td>
                            {telemetry
                              ? new Date(
                                  telemetry.timestamp
                                ).toLocaleString()
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