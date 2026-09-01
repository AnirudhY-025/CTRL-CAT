import type { Activity, Asset, Operator, Site, Condition, AssetInsights, DemandForecast, AlertResponse } from "./types";

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

export async function fetchActivity(limit = 20) {
  const response = await request<ApiEnvelope<Activity[]>>(`/api/activity?limit=${limit}`);
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

// ── ML & Alert APIs ─────────────────────────────────────────────────────────

export async function fetchInsights(assetId: string): Promise<AssetInsights> {
  return request<AssetInsights>(`/api/ml/insights/${encodeURIComponent(assetId)}`);
}

export async function fetchDemand(): Promise<DemandForecast> {
  const response = await request<ApiEnvelope<DemandForecast>>("/api/ml/demand");
  return response.data;
}

export async function triggerVoiceAlert(input: {
  phoneNumber: string;
  assetId?: string;
  assetName?: string;
  siteName?: string;
  customerName?: string;
  operatorName?: string;
  riskDescription?: string;
  errorCode?: string;
  scenario?: "emergency_alert" | "rental_extension" | "operator_diagnostic";
}): Promise<AlertResponse> {
  return request<AlertResponse>("/api/alerts/voice", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function triggerEmailAlert(input: {
  toEmail: string;
  managerName?: string;
  customerCompany?: string;
  assetId?: string;
  assetName?: string;
  siteName?: string;
  alertType?:
    | "anomaly"
    | "low_fuel"
    | "idle_overrun"
    | "utilization"
    | "temp_surge"
    | "sudden_damage"
    | "maintenance";
  detail?: string;
  customSubject?: string;
  customBody?: string;
}): Promise<AlertResponse> {
  return request<AlertResponse>("/api/alerts/email", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
