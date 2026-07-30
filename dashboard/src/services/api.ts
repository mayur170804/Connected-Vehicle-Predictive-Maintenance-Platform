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

export async function login(
  username: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  return response.json();
}

export async function getVehicles(
  token: string
): Promise<Vehicle[]> {
  const response = await fetch(`${API_BASE_URL}/api/vehicles`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load vehicles (${response.status})`
    );
  }

  return response.json();
}

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