import { NextResponse } from "next/server";

import { assetFromRow, activityFromRental } from "@/lib/server/assets";
import { findAssetRow } from "@/lib/server/equipment-query";
import { sql } from "@/lib/server/db";

const conditions = new Set(["Good", "Monitor", "Service due"]);

export async function POST(request: Request) {
  if (!sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const equipmentId = typeof body?.equipment_id === "string" ? body.equipment_id.trim() : "";
  const condition = typeof body?.condition === "string" ? body.condition : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";
  const returnTime = body?.return_time ? new Date(body.return_time) : new Date();

  if (!equipmentId || !conditions.has(condition)) {
    return NextResponse.json({ error: "equipment_id and a valid condition are required" }, { status: 400 });
  }
  if (Number.isNaN(returnTime.getTime())) {
    return NextResponse.json({ error: "return_time must be a valid date" }, { status: 400 });
  }

  try {
    const active = (await sql`
      SELECT r.*, e.equipment_type, e.display_name, s.name AS site_name, o.name AS operator_name
      FROM rentals r
      JOIN equipment e ON e.equipment_id = r.equipment_id
      LEFT JOIN sites s ON s.site_id = r.site_id
      LEFT JOIN operators o ON o.operator_id = r.operator_id
      WHERE r.equipment_id = ${equipmentId} AND r.end_date IS NULL
      ORDER BY r.start_date DESC LIMIT 1
    `) as Array<{
      rental_id: string;
      equipment_id: string;
      equipment_type: string;
      display_name: string | null;
      site_name: string | null;
      site_id: string;
      operator_name: string | null;
      operator_id: string | null;
      start_date: string;
    }>;

    if (!active[0]) {
      return NextResponse.json({ error: "No active rental found for equipment" }, { status: 409 });
    }

    const yard = (await sql`SELECT site_id FROM sites WHERE lower(name) LIKE '%yard%' ORDER BY site_id LIMIT 1`) as Array<{ site_id: string }>;
    const yardId = yard[0]?.site_id || active[0].site_id;

    await sql`
      UPDATE rentals
      SET end_date = ${returnTime.toISOString()}, return_condition = ${condition}, return_notes = ${notes || null}
      WHERE rental_id = ${active[0].rental_id}
    `;

    await sql`
      UPDATE equipment
      SET site_id = ${yardId}, operator_id = NULL, location = 'Return inspection', condition = ${condition},
          legacy_status = CASE WHEN ${condition} = 'Service due' THEN 'Maintenance' ELSE 'Available' END
      WHERE equipment_id = ${equipmentId}
    `;

    const row = await findAssetRow(sql, equipmentId);
    const asset = row ? assetFromRow(row) : null;
    const activity = activityFromRental({
      rental_id: String(active[0].rental_id),
      equipment_id: equipmentId,
      display_name: active[0].display_name as string | null,
      equipment_type: active[0].equipment_type as string,
      site_name: active[0].site_name as string | null,
      site_id: active[0].site_id as string,
      operator_name: active[0].operator_name as string | null,
      operator_id: active[0].operator_id as string | null,
      start_date: active[0].start_date as string,
      end_date: returnTime.toISOString(),
      return_condition: condition,
    });

    return NextResponse.json({ success: true, asset, activity, message: `${equipmentId} checked in successfully` });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Check-in failed" }, { status: 500 });
  }
}
