import { NextResponse } from "next/server";

import { assetFromRow, activityFromRental } from "@/lib/server/assets";
import { findAssetRow } from "@/lib/server/equipment-query";
import { pool, sql } from "@/lib/server/db";

const conditions = new Set(["Good", "Monitor", "Service due"]);

export async function POST(request: Request) {
  if (!pool || !sql) {
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

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const active = await client.query(
      "SELECT r.*, e.equipment_type, e.display_name, s.name AS site_name, o.name AS operator_name FROM rentals r JOIN equipment e ON e.equipment_id = r.equipment_id LEFT JOIN sites s ON s.site_id = r.site_id LEFT JOIN operators o ON o.operator_id = r.operator_id WHERE r.equipment_id = $1 AND r.end_date IS NULL FOR UPDATE",
      [equipmentId],
    );
    if (!active.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "No active rental found for equipment" }, { status: 409 });
    }

    const yard = await client.query("SELECT site_id FROM sites WHERE lower(name) LIKE '%yard%' ORDER BY site_id LIMIT 1");
    const yardId = yard.rows[0]?.site_id || active.rows[0].site_id;
    await client.query(
      "UPDATE rentals SET end_date = $1, return_condition = $2, return_notes = $3 WHERE rental_id = $4",
      [returnTime.toISOString(), condition, notes || null, active.rows[0].rental_id],
    );
    await client.query(
      "UPDATE equipment SET site_id = $1, operator_id = NULL, location = 'Return inspection', condition = $2, legacy_status = CASE WHEN $2 = 'Service due' THEN 'Maintenance' ELSE 'Available' END, check_in_date = $3::date, updated_at = now() WHERE equipment_id = $4",
      [yardId, condition, returnTime.toISOString(), equipmentId],
    );
    await client.query("COMMIT");

    const row = await findAssetRow(sql, equipmentId);
    const asset = row ? assetFromRow(row) : null;
    const activity = activityFromRental({
      rental_id: String(active.rows[0].rental_id),
      equipment_id: equipmentId,
      display_name: active.rows[0].display_name as string | null,
      equipment_type: active.rows[0].equipment_type as string,
      site_name: active.rows[0].site_name as string | null,
      site_id: active.rows[0].site_id as string,
      operator_name: active.rows[0].operator_name as string | null,
      operator_id: active.rows[0].operator_id as string | null,
      start_date: active.rows[0].start_date as string,
      end_date: returnTime.toISOString(),
      return_condition: condition,
    });
    return NextResponse.json({ success: true, asset, activity, message: `${equipmentId} checked in successfully` });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
