import { useEffect, useState } from "react";

import Header from "./components/Header";
import Login from "./components/Login";
import StatCard from "./components/StatCard";
import VehicleDetailsModal from "./components/VehicleDetailsModal";

import {
  getVehicles,
  getLatestTelemetry,
  getMaintenanceTickets,
  resolveMaintenanceTicket,
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

  const [resolvingTicketId, setResolvingTicketId] =
    useState<string | null>(null);

  const [showTicketHistory, setShowTicketHistory] =
    useState(false);

  const [selectedVehicle, setSelectedVehicle] =
    useState<Vehicle | null>(null);

    useEffect(() => {
      function handleAuthExpired() {
        setToken(null);
        setVehicles([]);
        setTelemetryByVehicle({});
        setMaintenanceTickets([]);
        setSelectedVehicle(null);
        setVehiclesError("");
        setResolvingTicketId(null);
        setShowTicketHistory(false);
      }

      window.addEventListener(
        "cvpm:auth-expired",
        handleAuthExpired
      );

      return () => {
        window.removeEventListener(
          "cvpm:auth-expired",
          handleAuthExpired
        );
      };
    }, []);

  /*
   * Backend health check
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
   * Initial dashboard load
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
        /*
         * Load vehicles
         */
        const vehicleData = await getVehicles(authToken);

        setVehicles(vehicleData);

        /*
         * Load maintenance tickets independently
         */
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

        /*
         * Load latest telemetry for every vehicle
         */
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
   * Refreshes:
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
      /*
       * Refresh latest telemetry
       */
      const telemetryEntries = await Promise.all(
        vehicles.map(async (vehicle) => {
          try {
            const telemetry =
              await getLatestTelemetry(
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

            return [
              vehicle.id,
              telemetry,
            ] as const;
          } catch (error) {
            console.error(
              "Telemetry refresh failed:",
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

      const nextTelemetry =
        Object.fromEntries(telemetryEntries);

      setTelemetryByVehicle(nextTelemetry);

      /*
       * Refresh maintenance tickets
       */
      try {
        const ticketData =
          await getMaintenanceTickets(authToken);

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
     * Refresh every 5 seconds
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
   * Resolve maintenance ticket
   */
  async function handleResolveTicket(
    ticketId: string
  ) {
    if (!token) {
      return;
    }

    try {
      setResolvingTicketId(ticketId);

      await resolveMaintenanceTicket(
        ticketId,
        token
      );

      /*
       * Reload tickets after resolve
       */
      const ticketData =
        await getMaintenanceTickets(token);

      setMaintenanceTickets(ticketData);
    } catch (error) {
      console.error(
        "Failed to resolve maintenance ticket:",
        error
      );
    } finally {
      setResolvingTicketId(null);
    }
  }

  /*
   * Login
   */
  async function handleLogin(
    username: string,
    password: string
  ) {
    const result = await login(
      username,
      password
    );

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
    setSelectedVehicle(null);
    setVehiclesError("");
    setResolvingTicketId(null);
    setShowTicketHistory(false);
  }

  /*
   * Login screen
   */
  if (!token) {
    return (
      <Login onLogin={handleLogin} />
    );
  }

  /*
   * Dashboard statistics
   */
  const highRiskCount =
    Object.values(
      telemetryByVehicle
    ).filter(
      (telemetry) =>
        telemetry?.riskLevel === "HIGH"
    ).length;

  const openTicketCount =
    maintenanceTickets.filter(
      (ticket) =>
        ticket.status?.toUpperCase() ===
        "OPEN"
    ).length;

  /*
   * Open maintenance tickets
   */
  const openTickets =
    maintenanceTickets.filter(
      (ticket) =>
        ticket.status?.toUpperCase() ===
        "OPEN"
    );

  /*
   * Latest 10 resolved tickets
   *
   * Prefer updatedAt because that represents
   * when the ticket was resolved.
   */
  const resolvedTickets =
    maintenanceTickets
      .filter(
        (ticket) =>
          ticket.status?.toUpperCase() ===
          "RESOLVED"
      )
      .sort((a, b) => {
        const bTime = new Date(
          b.updatedAt ?? b.createdAt
        ).getTime();

        const aTime = new Date(
          a.updatedAt ?? a.createdAt
        ).getTime();

        return bTime - aTime;
      })
      .slice(0, 10);

  return (
    <div className="app">
      <Header
        serviceStatus={status}
      />

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
              requirements from one
              dashboard.
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

        {/* Fleet overview */}

        <section className="panel">
          <div className="panelHeader">
            <div>
              <h3>
                Fleet Overview
              </h3>

              <p>
                Registered vehicles in
                the connected fleet.
              </p>
            </div>
          </div>

          {/* Loading */}

          {vehiclesLoading && (
            <div className="emptyState">
              <p>
                Loading vehicles...
              </p>
            </div>
          )}

          {/* Error */}

          {vehiclesError && (
            <div className="emptyState">
              <h3>
                Unable to load fleet
              </h3>

              <p>
                {vehiclesError}
              </p>
            </div>
          )}

          {/* Empty fleet */}

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
                  Vehicles will appear
                  here when they are
                  registered.
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
                    {vehicles.map(
                      (vehicle) => {
                        const telemetry =
                          telemetryByVehicle[
                            vehicle.id
                          ];

                        return (
                          <tr
                            key={vehicle.id}
                            onClick={() => setSelectedVehicle(vehicle)}
                            className={`clickableVehicleRow ${
                              telemetry?.riskLevel === "HIGH"
                                ? "highRiskRow"
                                : ""
                            }`}
                          >
                            <td className="vin">
                              {vehicle.vin}
                            </td>

                            <td>
                              {vehicle.make ||
                                "—"}{" "}
                              {vehicle.model ||
                                ""}
                            </td>

                            <td>
                              {vehicle.year ??
                                "—"}
                            </td>

                            <td>
                              {telemetry?.riskLevel ? (
                                <span
                                  className={`riskBadge risk${telemetry.riskLevel}`}
                                >
                                  {
                                    telemetry.riskLevel
                                  }
                                </span>
                              ) : (
                                "—"
                              )}
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
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </section>

        {/* Maintenance tickets */}

        <section className="panel maintenancePanel">
          <div className="panelHeader">
            <div>
              <h3>
                Maintenance Tickets
              </h3>

              <p>
                Active maintenance alerts
                generated from vehicle risk
                events.
              </p>
            </div>

            <span className="ticketCount">
              {openTickets.length} open
            </span>
          </div>

          {/* Open tickets */}

          {openTickets.length === 0 ? (
            <div className="ticketEmptyState">
              No open maintenance tickets.
            </div>
          ) : (
            <div className="tableWrapper">
              <table className="vehicleTable">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Risk</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {openTickets.map(
                    (ticket) => {
                      const vehicle =
                        vehicles.find(
                          (vehicle) =>
                            vehicle.id ===
                            ticket.vehicleId
                        );

                      const ticketRisk =
                        ticket.riskLevel
                          ?.toUpperCase() ??
                        "UNKNOWN";

                      return (
                        <tr key={ticket.id}>
                          <td className="vin">
                            {vehicle?.vin ??
                              ticket.vehicleId}
                          </td>

                          <td>
                            <span
                              className={`riskBadge risk${ticketRisk}`}
                            >
                              {ticketRisk}
                            </span>
                          </td>

                          <td className="ticketReason">
                            {ticket.reason ||
                              "—"}
                          </td>

                          <td>
                            <span className="ticketStatus ticketOpen">
                              OPEN
                            </span>
                          </td>

                          <td>
                            {new Date(
                              ticket.createdAt
                            ).toLocaleString()}
                          </td>

                          <td>
                            <button
                              className="resolveButton"
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `Are you sure you want to resolve this maintenance ticket for ${
                                    vehicle?.vin ?? ticket.vehicleId
                                  }?`
                                );

                                if (confirmed) {
                                  handleResolveTicket(ticket.id);
                                }
                              }}
                              disabled={
                                resolvingTicketId === ticket.id
                              }
                            >
                              {resolvingTicketId === ticket.id
                                ? "Resolving..."
                                : "Resolve"}
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Ticket history */}

          {resolvedTickets.length > 0 && (
            <div className="ticketHistory">
              <button
                className="historyToggle"
                onClick={() =>
                  setShowTicketHistory(
                    (current) => !current
                  )
                }
              >
                <span>
                  Ticket History{" "}
                  <span className="historyCount">
                    {resolvedTickets.length}
                  </span>
                </span>

                <span>
                  {showTicketHistory
                    ? "Hide"
                    : "Show"}
                </span>
              </button>

              {showTicketHistory && (
                <div className="tableWrapper historyTable">
                  <table className="vehicleTable">
                    <thead>
                      <tr>
                        <th>Vehicle</th>
                        <th>Risk</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Resolved</th>
                      </tr>
                    </thead>

                    <tbody>
                      {resolvedTickets.map(
                        (ticket) => {
                          const vehicle =
                            vehicles.find(
                              (vehicle) =>
                                vehicle.id ===
                                ticket.vehicleId
                            );

                          const ticketRisk =
                            ticket.riskLevel
                              ?.toUpperCase() ??
                            "UNKNOWN";

                          return (
                            <tr key={ticket.id}>
                              <td className="vin">
                                {vehicle?.vin ??
                                  ticket.vehicleId}
                              </td>

                              <td>
                                <span
                                  className={`riskBadge risk${ticketRisk}`}
                                >
                                  {ticketRisk}
                                </span>
                              </td>

                              <td className="ticketReason">
                                {ticket.reason ||
                                  "—"}
                              </td>

                              <td>
                                <span className="ticketStatus ticketClosed">
                                  RESOLVED
                                </span>
                              </td>

                              <td>
                                {new Date(
                                  ticket.updatedAt ??
                                    ticket.createdAt
                                ).toLocaleString()}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          latestTelemetry={
            telemetryByVehicle[selectedVehicle.id] ??
            null
          }
          token={token}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}