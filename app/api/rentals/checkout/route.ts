import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { findAssetRow } from "@/lib/server/equipment-query";
import { activityFromRental, assetFromRow } from "@/lib/server/assets";
import { sql } from "@/lib/server/db";

export async function POST(request: Request) {
  if (!sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const equipmentId = typeof body?.equipment_id === "string" ? body.equipment_id.trim() : "";
  const siteId = typeof body?.site_id === "string" ? body.site_id.trim() : "";
  const operatorId = typeof body?.operator_id === "string" && body.operator_id.trim() ? body.operator_id.trim() : null;
  const location = typeof body?.location === "string" && body.location.trim() ? body.location.trim() : "Main Workface";

  if (!equipmentId || !siteId) {
    return NextResponse.json({ error: "equipment_id and site_id are required" }, { status: 400 });
  }

  try {
    const equipmentRows = (await sql`
      SELECT equipment_id, legacy_status, condition FROM equipment WHERE equipment_id = ${equipmentId}
    `) as Array<{ equipment_id: string; legacy_status: string; condition: string }>;

    if (!equipmentRows[0]) {
      return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const status = String(equipmentRows[0].legacy_status || "").toLowerCase();
    if (["maintenance", "safety alert", "anomaly", "idle risk"].includes(status)) {
      return NextResponse.json({ error: "Equipment is not available for checkout" }, { status: 409 });
    }

    const activeRentals = (await sql`
      SELECT rental_id FROM rentals WHERE equipment_id = ${equipmentId} AND end_date IS NULL
    `) as Array<{ rental_id: string }>;

    if (activeRentals[0]) {
      return NextResponse.json({ error: "Equipment is already checked out" }, { status: 409 });
    }

    // Resolve site ID if passed as site_id or site name
    let validSiteId = siteId;
    const siteRows = (await sql`SELECT site_id FROM sites WHERE site_id = ${siteId}`) as Array<{ site_id: string }>;
    if (!siteRows[0]) {
      const siteByName = (await sql`
        SELECT site_id FROM sites WHERE lower(name) = lower(${siteId}) OR lower(name) LIKE ${'%' + siteId.toLowerCase() + '%'} LIMIT 1
      `) as Array<{ site_id: string }>;
      if (siteByName[0]) {
        validSiteId = siteByName[0].site_id;
      } else {
        const anySite = (await sql`SELECT site_id FROM sites LIMIT 1`) as Array<{ site_id: string }>;
        validSiteId = anySite[0]?.site_id || siteId;
      }
    }

    // Resolve operator ID if provided
    let validOperatorId: string | null = operatorId;
    if (operatorId) {
      const operatorRows = (await sql`
        SELECT operator_id FROM operators WHERE operator_id = ${operatorId} OR lower(name) = lower(${operatorId}) LIMIT 1
      `) as Array<{ operator_id: string }>;
      validOperatorId = operatorRows[0]?.operator_id || null;
    }

    const rentalId = `R_${Date.now()}_${randomUUID().slice(0, 8)}`;

    await sql`
      INSERT INTO rentals (rental_id, equipment_id, site_id, operator_id, start_date, location)
      VALUES (${rentalId}, ${equipmentId}, ${validSiteId}, ${validOperatorId}, now(), ${location})
    `;

    await sql`
      UPDATE equipment
      SET site_id = ${validSiteId}, operator_id = ${validOperatorId}, location = ${location}, legacy_status = 'Active'
      WHERE equipment_id = ${equipmentId}
    `;

    const row = await findAssetRow(sql, equipmentId);
    const asset = row ? assetFromRow(row) : null;
    const activity = activityFromRental({
      ...row,
      rental_id: rentalId,
      start_date: new Date().toISOString(),
      end_date: null,
    });

    return NextResponse.json({
      success: true,
      rental_id: rentalId,
      asset,
      activity,
      message: `${equipmentId} checked out successfully`,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 500 });
  }
}
