import { NextResponse } from "next/server";

import type { DashboardMetrics } from "@/lib/types";
import { sql } from "@/lib/server/db";

const EMPTY_METRICS: DashboardMetrics = {
  fleetUtilizationPct: null,
  fleetUtilizationChangePct: null,
  maintenanceBacklog: null,
  telemetryCoveragePct: null,
  telemetryStaleCount: null,
  telemetryAsOf: null,
};

type UtilizationRow = {
  current_avg: number | null;
  previous_avg: number | null;
};

type MaintenanceRow = { backlog: number | string | null };

type CoverageRow = {
  total_assets: number | string | null;
  reporting_assets: number | string | null;
  as_of: string | null;
};

export async function GET() {
  if (!sql) {
    return NextResponse.json({ data: EMPTY_METRICS });
  }

  try {
    const [utilizationRowsRaw, maintenanceRowsRaw, coverageRowsRaw] = await Promise.all([
      sql`
        SELECT
          AVG(utilization_pct) FILTER (
            WHERE date >= CURRENT_DATE - INTERVAL '6 days'
          ) AS current_avg,
          AVG(utilization_pct) FILTER (
            WHERE date >= CURRENT_DATE - INTERVAL '13 days'
              AND date < CURRENT_DATE - INTERVAL '6 days'
          ) AS previous_avg
        FROM daily_usage
        WHERE date >= CURRENT_DATE - INTERVAL '13 days'
      `,
      sql`
        SELECT COUNT(*)::int AS backlog
        FROM equipment
        WHERE condition = 'Service due'
          OR LOWER(COALESCE(legacy_status, '')) IN (
            'maintenance',
            'safety alert',
            'anomaly',
            'idle risk'
          )
      `,
      sql`
        SELECT
          COUNT(*)::int AS total_assets,
          COUNT(*) FILTER (WHERE latest_usage.latest_date >= CURRENT_DATE)::int
            AS reporting_assets,
          CURRENT_DATE::text AS as_of
        FROM equipment e
        LEFT JOIN LATERAL (
          SELECT MAX(date) AS latest_date
          FROM daily_usage
          WHERE equipment_id = e.equipment_id
        ) latest_usage ON true
      `
    ]);
    const utilizationRows = utilizationRowsRaw as unknown as UtilizationRow[];
    const maintenanceRows = maintenanceRowsRaw as unknown as MaintenanceRow[];
    const coverageRows = coverageRowsRaw as unknown as CoverageRow[];

    const utilization = utilizationRows[0];
    const maintenance = maintenanceRows[0];
    const coverage = coverageRows[0];
    const totalAssets = Number(coverage?.total_assets ?? 0);
    const reportingAssets = Number(coverage?.reporting_assets ?? 0);
    const currentAvg = utilization?.current_avg;
    const previousAvg = utilization?.previous_avg;

    const metrics: DashboardMetrics = {
      fleetUtilizationPct:
        currentAvg === null || currentAvg === undefined
          ? null
          : Number(currentAvg),
      fleetUtilizationChangePct:
        currentAvg === null ||
        currentAvg === undefined ||
        previousAvg === null ||
        previousAvg === undefined
          ? null
          : Number(currentAvg) - Number(previousAvg),
      maintenanceBacklog:
        maintenance?.backlog === null || maintenance?.backlog === undefined
          ? null
          : Number(maintenance.backlog),
      telemetryCoveragePct:
        totalAssets > 0 ? (reportingAssets / totalAssets) * 100 : null,
      telemetryStaleCount: totalAssets > 0 ? totalAssets - reportingAssets : null,
      telemetryAsOf: coverage?.as_of ?? null,
    };

    return NextResponse.json({ data: metrics });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json({ data: EMPTY_METRICS });
  }
}
