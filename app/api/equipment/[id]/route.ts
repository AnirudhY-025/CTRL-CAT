import { NextResponse } from "next/server";

import { findAsset, findAssetRow } from "@/lib/server/equipment-query";
import { sql } from "@/lib/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const [asset, row] = await Promise.all([findAsset(sql, id), findAssetRow(sql, id)]);
    if (!asset || !row) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const [telemetryHistory, maintenanceHistory] = await Promise.all([
      sql`SELECT * FROM daily_usage WHERE equipment_id = ${id} ORDER BY date DESC LIMIT 14`,
      sql`SELECT * FROM maintenance WHERE equipment_id = ${id} ORDER BY date DESC LIMIT 5`,
    ]);

    return NextResponse.json({
      equipment: asset,
      current_rental: row.rental_id ? {
        rental_id: row.rental_id,
        site_id: row.site_id,
        operator_id: row.rental_operator_id,
        start_date: row.start_date,
        location: row.rental_location,
      } : null,
      telemetry: telemetryHistory[0] || null,
      telemetry_history: telemetryHistory,
      maintenance_history: maintenanceHistory,
    });
  } catch (error) {
    console.error("Error fetching equipment detail:", error);
    return NextResponse.json({ error: "Unable to load equipment detail" }, { status: 500 });
  }
}
