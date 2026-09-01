import type { Activity, Asset, Operator, Site, Condition } from "./types";

type ApiEnvelope<T> = { data: T };

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || "Request failed");
  }
  return body as T;
}

export async function fetchEquipment() {
  const response = await request<ApiEnvelope<Asset[]>>("/api/equipment");
  return response.data;
}

export async function fetchEquipmentDetail(id: string) {
  return request<{
    equipment: Asset;
    current_rental: Record<string, unknown> | null;
    telemetry: Record<string, unknown> | null;
    telemetry_history: Record<string, unknown>[];
    maintenance_history: Record<string, unknown>[];
  }>(`/api/equipment/${encodeURIComponent(id)}`);
}

export async function fetchSites() {
  const response = await request<ApiEnvelope<Site[]>>("/api/sites");
  return response.data;
}

export async function fetchOperators() {
  const response = await request<ApiEnvelope<Operator[]>>("/api/operators");
  return response.data;
}

export async function fetchActivity() {
  const response = await request<ApiEnvelope<Activity[]>>("/api/activity");
  return response.data;
}

export async function checkoutEquipment(input: {
  equipmentId: string;
  operatorId: string | null;
  siteId: string;
  location: string;
}) {
  return request<{ asset: Asset; activity: Activity; message: string }>(
    "/api/rentals/checkout",
    {
      method: "POST",
      body: JSON.stringify({
        equipment_id: input.equipmentId,
        operator_id: input.operatorId,
        site_id: input.siteId,
        location: input.location,
      }),
    },
  );
}

export async function checkinEquipment(input: {
  equipmentId: string;
  returnTime: string;
  condition: Condition;
  notes: string;
}) {
  return request<{ asset: Asset; activity: Activity; message: string }>(
    "/api/rentals/checkin",
    {
      method: "POST",
      body: JSON.stringify({
        equipment_id: input.equipmentId,
        return_time: input.returnTime,
        condition: input.condition,
        notes: input.notes,
      }),
    },
  );
}
