import { NextResponse } from "next/server";

import { findAssetRow } from "@/lib/server/equipment-query";
import { sql } from "@/lib/server/db";
import type { AssetInsights, RiskLevel } from "@/lib/types";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://127.0.0.1:8000";

function deriveRisk(confidence: number, predicted: boolean): RiskLevel {
  if (!predicted) return "Low";
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!sql) {
    return NextResponse.json<AssetInsights>(
      { utilization: null, anomaly: null, maintenance: null, error: "DB not configured" },
      { status: 503 },
    );
  }

  // 1. Fetch the latest telemetry row for this asset from Neon
  const row = await findAssetRow(sql, id).catch(() => null);
  if (!row) {
    return NextResponse.json<AssetInsights>(
      { utilization: null, anomaly: null, maintenance: null, error: "Asset not found" },
      { status: 404 },
    );
  }

  // Pull the 3-day rolling stats we stored during ingestion
  const rollingRows = await sql`
    SELECT
      AVG(dtc_warning_active::int) AS roll_dtc_3d,
      AVG(sos_fluid_alert::int)    AS roll_sos_3d,
      SUM(engine_hours)            AS roll_hours,
      MAX(total_hours)             AS total_hours,
      MAX(utilization_pct)         AS utilization_pct,
      MAX(engine_hours)            AS engine_hours,
      MAX(idle_hours)              AS idle_hours,
      MAX(fuel_level_pct)          AS fuel_level_pct
    FROM daily_usage
    WHERE equipment_id = ${id}
      AND date >= CURRENT_DATE - INTERVAL '3 days'
  ` as { roll_dtc_3d: number; roll_sos_3d: number; roll_hours: number; total_hours: number; utilization_pct: number; engine_hours: number; idle_hours: number; fuel_level_pct: number }[];

  const stats = rollingRows[0] ?? {};

  // Derive a fuel_consumed proxy: assume each engine-hour burns ~10L at full tank = 100%
  // fuel_level_pct tells us remaining %, so consumed ≈ (100 - fuel_level_pct) * 0.1 * engine_hours
  const fuelLevelPct = stats.fuel_level_pct ?? row.fuel_level_pct ?? 50;
  const engineHrs = stats.engine_hours ?? row.engine_hours ?? 1;
  const fuelConsumedProxy = Math.max(0, (100 - fuelLevelPct) * 0.1 * engineHrs);

  const telemetryPayload = {
    engine_hours: engineHrs,
    idle_hours: stats.idle_hours ?? row.idle_hours ?? 0,
    fuel_consumed: fuelConsumedProxy,
    utilization_pct: stats.utilization_pct ?? row.idle_hours_per_day ?? 60,
    age_years: row.age_years ?? 3,
    fuel_per_hour: fuelConsumedProxy / Math.max(engineHrs, 0.001),
    total_hours: stats.total_hours ?? (row.engine_hours ?? 0) * 365,
    roll_hours: stats.roll_hours ?? 0,
    roll_dtc_3d: stats.roll_dtc_3d ?? 0,
    roll_sos_3d: stats.roll_sos_3d ?? 0,
  };

  // 2. Fan out to all three FastAPI endpoints in parallel
  const [utilResult, anomalyResult, maintResult] = await Promise.allSettled([
    fetch(`${FASTAPI_URL}/predict/utilization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telemetryPayload),
    }).then((r) => r.json()),

    fetch(`${FASTAPI_URL}/predict/anomaly`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telemetryPayload),
    }).then((r) => r.json()),

    fetch(`${FASTAPI_URL}/predict/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(telemetryPayload),
    }).then((r) => r.json()),
  ]);

  const utilization =
    utilResult.status === "fulfilled"
      ? {
          category: String(utilResult.value.prediction ?? "Normal"),
          confidence: Number(utilResult.value.confidence ?? 0),
        }
      : null;

  const anomaly =
    anomalyResult.status === "fulfilled"
      ? { isAnomalous: Boolean(anomalyResult.value.is_anomaly) }
      : null;

  const maintRaw =
    maintResult.status === "fulfilled" ? maintResult.value : null;
  const maintenance = maintRaw
    ? {
        riskIn7Days: Boolean(maintRaw.maintenance_risk_7d),
        confidence: Number(maintRaw.confidence ?? 0),
        risk: deriveRisk(
          Number(maintRaw.confidence ?? 0),
          Boolean(maintRaw.maintenance_risk_7d),
        ),
      }
    : null;

  return NextResponse.json<AssetInsights>({ utilization, anomaly, maintenance });
}
