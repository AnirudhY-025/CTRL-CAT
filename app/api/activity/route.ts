import { NextResponse } from "next/server";

import { sql } from "@/lib/server/db";
import { activityFromRental } from "@/lib/server/assets";

type RentalActivityRow = {
  rental_id: string; equipment_id: string; start_date: string; end_date: string | null;
  return_condition: string | null; site_id: string; operator_id: string | null;
  display_name: string | null; equipment_type: string; site_name: string | null; operator_name: string | null;
};
type TelemetryActivityRow = {
  id: string; equipment_id: string; event_type: string; description: string | null;
  created_at: string; display_name: string | null; equipment_type: string;
};

export async function GET(request: Request) {
  if (!sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  try {
    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get("limit") || 20), 1), 100);
    const rows = await sql`
      SELECT r.rental_id, r.equipment_id, r.start_date, r.end_date, r.return_condition,
        r.site_id, r.operator_id, e.display_name, e.equipment_type,
        s.name AS site_name, o.name AS operator_name
      FROM rentals r
      JOIN equipment e ON e.equipment_id = r.equipment_id
      LEFT JOIN sites s ON s.site_id = r.site_id
      LEFT JOIN operators o ON o.operator_id = r.operator_id
      ORDER BY COALESCE(r.end_date, r.start_date) DESC
      LIMIT ${limit}
    `;
    const telemetry = await sql`
      SELECT t.id, t.equipment_id, t.event_type, t.description, t.created_at,
        e.display_name, e.equipment_type
      FROM telemetry_events t
      JOIN equipment e ON e.equipment_id = t.equipment_id
      ORDER BY t.created_at DESC LIMIT ${limit}
    `;
    const activity = [
      ...rows.map((rawRow) => activityFromRental(rawRow as unknown as RentalActivityRow)),
      ...telemetry.map((rawRow) => { const row = rawRow as unknown as TelemetryActivityRow; return ({
        id: String(row.id),
        action: row.event_type,
        assetId: row.equipment_id,
        assetName: row.display_name || `CAT ${row.equipment_type}`,
        detail: row.description || "Telemetry event",
        time: String(row.created_at),
        tone: "red" as const,
      }); }),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
    return NextResponse.json({ data: activity });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json({ error: "Unable to load activity" }, { status: 500 });
  }
}
