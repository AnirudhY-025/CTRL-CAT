import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { findAssetRow } from "@/lib/server/equipment-query";
import { activityFromRental, assetFromRow } from "@/lib/server/assets";
import { pool, sql } from "@/lib/server/db";

export async function POST(request: Request) {
  if (!pool || !sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const equipmentId = typeof body?.equipment_id === "string" ? body.equipment_id.trim() : "";
  const siteId = typeof body?.site_id === "string" ? body.site_id.trim() : "";
  const operatorId = typeof body?.operator_id === "string" && body.operator_id.trim() ? body.operator_id.trim() : null;
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  if (!equipmentId || !siteId || !location) {
    return NextResponse.json({ error: "equipment_id, site_id, and location are required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const equipment = await client.query(
      "SELECT equipment_id, legacy_status, condition FROM equipment WHERE equipment_id = $1 FOR UPDATE",
      [equipmentId],
    );
    if (!equipment.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }
    const status = String(equipment.rows[0].legacy_status || "").toLowerCase();
    if (["maintenance", "safety alert", "anomaly", "idle risk"].includes(status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Equipment is not available for checkout" }, { status: 409 });
    }
    const activeRental = await client.query(
      "SELECT rental_id FROM rentals WHERE equipment_id = $1 AND end_date IS NULL FOR UPDATE",
      [equipmentId],
    );
    if (activeRental.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Equipment is already checked out" }, { status: 409 });
    }
    const site = await client.query("SELECT site_id FROM sites WHERE site_id = $1", [siteId]);
    if (!site.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Site not found" }, { status: 400 });
    }
    if (operatorId) {
      const operator = await client.query("SELECT operator_id FROM operators WHERE operator_id = $1", [operatorId]);
      if (!operator.rows[0]) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Operator not found" }, { status: 400 });
      }
    }

    const rentalId = `R_${Date.now()}_${randomUUID().slice(0, 8)}`;
    await client.query(
      "INSERT INTO rentals (rental_id, equipment_id, site_id, operator_id, start_date, location) VALUES ($1, $2, $3, $4, now(), $5)",
      [rentalId, equipmentId, siteId, operatorId, location],
    );
    await client.query(
      "UPDATE equipment SET site_id = $1, operator_id = $2, location = $3, legacy_status = 'Active', check_out_date = current_date, updated_at = now() WHERE equipment_id = $4",
      [siteId, operatorId, location, equipmentId],
    );
    await client.query("COMMIT");

    const row = await findAssetRow(sql, equipmentId);
    const asset = row ? assetFromRow(row) : null;
    const activity = activityFromRental({ ...row, rental_id: rentalId, start_date: new Date().toISOString(), end_date: null });
    return NextResponse.json({ success: true, rental_id: rentalId, asset, activity, message: `${equipmentId} checked out successfully` });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  } finally {
    client.release();
  }
}
