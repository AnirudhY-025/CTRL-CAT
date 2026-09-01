import type { Activity, Asset, Condition } from "../types";

export type AssetRow = {
  equipment_id: string;
  equipment_type: string;
  display_name?: string | null;
  serial_number?: string | null;
  operator_id?: string | null;
  rental_operator_id?: string | null;
  operator_name?: string | null;
  location?: string | null;
  rental_location?: string | null;
  site_id?: string | null;
  site_name?: string | null;
  site_type?: string | null;
  rental_id?: string | null;
  rental_end_date?: string | Date | null;
  start_date?: string | Date | null;
  age_years?: number | null;
  condition?: string | null;
  legacy_status?: string | null;
  engine_hours_per_day?: number | null;
  idle_hours_per_day?: number | null;
  engine_hours?: number | null;
  idle_hours?: number | null;
  fuel_level_pct?: number | null;
  last_active_date?: string | Date | null;
  dtc_warning_active?: boolean | number | null;
  sos_fluid_alert?: boolean | number | null;
  is_anomaly?: boolean | number | null;
};

function initials(name: string | null) {
  return name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;
}

function conditionFor(row: AssetRow): Condition {
  if (row.condition === "Good" || row.condition === "Monitor" || row.condition === "Service due") {
    return row.condition;
  }
  if (row.sos_fluid_alert || row.is_anomaly || row.dtc_warning_active) {
    return "Service due";
  }
  if (row.fuel_level_pct !== null && row.fuel_level_pct !== undefined && row.fuel_level_pct < 50) {
    return "Monitor";
  }
  return "Good";
}

function statusFor(row: AssetRow): Asset["status"] {
  if (row.rental_id && !row.rental_end_date) return "checked-out";
  const status = String(row.legacy_status || "").toLowerCase();
  if (["maintenance", "safety alert", "anomaly", "idle risk"].includes(status)) {
    return "maintenance";
  }
  return "available";
}

export function assetFromRow(row: AssetRow): Asset {
  const operator = row.operator_name || row.rental_operator_id || row.operator_id || null;
  return {
    id: row.equipment_id,
    name: row.display_name || `CAT ${row.equipment_type}`,
    category: row.equipment_type,
    serialNumber: row.serial_number || row.equipment_id,
    status: statusFor(row),
    site: row.site_name || row.site_type || "Unassigned",
    location: row.rental_location || row.location || "Unassigned",
    operator,
    operatorInitials: initials(operator),
    engineHours: row.engine_hours ?? row.engine_hours_per_day ?? null,
    idleHours: row.idle_hours ?? row.idle_hours_per_day ?? null,
    fuelLevel: row.fuel_level_pct ?? null,
    condition: conditionFor(row),
    lastActivity: row.last_active_date
      ? new Date(row.last_active_date).toLocaleDateString()
      : "No telemetry",
    siteId: row.site_id || null,
    operatorId: row.rental_operator_id || row.operator_id || null,
    rentalId: row.rental_id || null,
  };
}

export function activityFromRental(row: {
  rental_id: string;
  equipment_id: string;
  display_name?: string | null;
  equipment_type?: string | null;
  end_date?: string | Date | null;
  return_condition?: string | null;
  site_name?: string | null;
  site_id?: string | null;
  operator_name?: string | null;
  operator_id?: string | null;
  start_date?: string | Date | null;
}) : Activity {
  const returned = Boolean(row.end_date);
  return {
    id: `rental-${row.rental_id}`,
    action: returned ? "Asset returned" : "Equipment checked out",
    assetId: row.equipment_id,
    assetName: row.display_name || `CAT ${row.equipment_type || "equipment"}`,
    detail: returned
      ? `Final condition: ${row.return_condition || "Good"}`
      : `${row.site_name || row.site_id} · ${row.operator_name || row.operator_id || "Unassigned"}`,
    time: returned ? String(row.end_date) : String(row.start_date),
    tone: returned ? "green" : "amber",
  };
}
