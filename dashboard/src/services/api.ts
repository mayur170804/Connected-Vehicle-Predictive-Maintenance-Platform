const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

export interface LoginResponse {
  token: string;
  username: string;
  role: string;
  expiresInSeconds: number;
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  createdAt: string;
}

export interface Telemetry {
  id: string;
  vehicleId: string;
  timestamp: string;
  engineTemperature: number;
  batteryLevel: number;
  vibration: number;
  mileage: number;
  faultCode: string | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  scoredAt: string | null;
}

export interface MaintenanceTicket {
  id: string;
  vehicleId: string;
  telemetryId: string;
  status: string;
  riskLevel: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

/*
 * Authentication
 */

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Invalid username or password"
    );
  }

  return response.json();
}

/*
 * Vehicles
 */

export async function getVehicles(
  token: string
): Promise<Vehicle[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load vehicles (${response.status})`
    );
  }

  return response.json();
}

/*
 * Maintenance tickets
 */

export async function getMaintenanceTickets(
  token: string
): Promise<MaintenanceTicket[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/maintenance/tickets`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load maintenance tickets (${response.status})`
    );
  }

  return response.json();
}

export async function resolveMaintenanceTicket(
  ticketId: string,
  token: string
): Promise<MaintenanceTicket> {
  const response = await fetch(
    `${API_BASE_URL}/api/maintenance/tickets/${ticketId}/resolve`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to resolve maintenance ticket (${response.status})`
    );
  }

  return response.json();
}

/*
 * Latest telemetry
 */

export async function getLatestTelemetry(
  vehicleId: string,
  token: string
): Promise<Telemetry | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/${vehicleId}/telemetry/latest`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to load latest telemetry (${response.status})`
    );
  }

  return response.json();
}

/*
 * Telemetry history
 */

export async function getTelemetryHistory(
  vehicleId: string,
  token: string
): Promise<Telemetry[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/${vehicleId}/telemetry`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load telemetry history (${response.status})`
    );
  }

  return response.json();
}