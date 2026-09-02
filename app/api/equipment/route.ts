import { NextResponse } from "next/server";

import { listAssets, findAssetRow } from "@/lib/server/equipment-query";
import { assetFromRow } from "@/lib/server/assets";
import { sql } from "@/lib/server/db";

export async function GET(request: Request) {
  if (!sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  try {
    const requestedLimit = new URL(request.url).searchParams.get("limit");
    const limit = Math.min(
      Math.max(Number(requestedLimit || 1000), 1),
      1000,
    );
    const assets = (await listAssets(sql)).slice(0, limit);
    return NextResponse.json({ data: assets });
  } catch (error) {
    console.error("Error fetching equipment:", error);
    return NextResponse.json({ error: "Unable to load equipment" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => null);
    const equipmentId = typeof body?.equipment_id === "string" ? body.equipment_id.trim().toUpperCase() : "";
    const equipmentType = typeof body?.equipment_type === "string" ? body.equipment_type.trim() : "Excavator";
    const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : "";
    const serialNumber = typeof body?.serial_number === "string" ? body.serial_number.trim() : equipmentId;
    const location = typeof body?.location === "string" ? body.location.trim() : "Main Yard";
    const condition = typeof body?.condition === "string" ? body.condition.trim() : "Good";
    const ageYears = Number(body?.age_years) || 1;
    const engineHours = Number(body?.engine_hours) || 0;
    const idleHours = Number(body?.idle_hours) || 0;
    const fuelLevel = Number(body?.fuel_level) || 100;

    if (!equipmentId) {
      return NextResponse.json({ error: "Equipment ID is required (e.g. EQX-1020)" }, { status: 400 });
    }

    const name = displayName || `CAT ${equipmentType} ${equipmentId}`;

    // Check if ID exists
    const existing = (await sql`SELECT equipment_id FROM equipment WHERE equipment_id = ${equipmentId}`) as any[];
    if (existing.length > 0) {
      return NextResponse.json({ error: `Equipment with ID "${equipmentId}" already exists.` }, { status: 409 });
    }

    // Insert into equipment table
    await sql`
      INSERT INTO equipment (
        equipment_id,
        equipment_type,
        display_name,
        serial_number,
        location,
        condition,
        legacy_status,
        age_years,
        engine_hours_per_day,
        idle_hours_per_day
      ) VALUES (
        ${equipmentId},
        ${equipmentType},
        ${name},
        ${serialNumber},
        ${location},
        ${condition},
        'Available',
        ${ageYears},
        ${engineHours},
        ${idleHours}
      )
    `;

    // Insert initial telemetry snapshot in daily_usage if possible
    try {
      await sql`
        INSERT INTO daily_usage (
          equipment_id,
          date,
          utilization_pct,
          engine_hours,
          idle_hours,
          fuel_level_pct,
          total_hours
        ) VALUES (
          ${equipmentId},
          CURRENT_DATE,
          0,
          ${engineHours},
          ${idleHours},
          ${fuelLevel},
          ${engineHours}
        )
      `;
    } catch (telemetryErr) {
      console.warn("Could not insert initial daily_usage (non-fatal):", telemetryErr);
    }

    const row = await findAssetRow(sql, equipmentId);
    const asset = row ? assetFromRow(row) : null;

    return NextResponse.json({
      success: true,
      message: `Asset ${equipmentId} created successfully.`,
      asset,
    });
  } catch (error: any) {
    console.error("Error creating equipment:", error);
    return NextResponse.json({ error: error?.message || "Failed to create equipment" }, { status: 500 });
  }
}

