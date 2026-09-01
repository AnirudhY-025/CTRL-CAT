import { NextResponse } from "next/server";

import { sql } from "@/lib/server/db";

type SiteRow = { id: string; name: string | null; code: string; customer_name: string | null; active_equipment_count: number };

const FALLBACK_SITES = [
  { id: "S_001", name: "Central Rental Yard", code: "S_001", customerName: "Internal / Yard", activeEquipmentCount: 4 },
  { id: "S_002", name: "Northline Expansion", code: "S_002", customerName: "Prestige Group", activeEquipmentCount: 2 },
  { id: "S_003", name: "Riverbend Materials", code: "S_003", customerName: "Sobha Constructions", activeEquipmentCount: 3 },
  { id: "S_004", name: "Westport Logistics", code: "S_004", customerName: "L&T Infrastructure", activeEquipmentCount: 3 },
];

export async function GET() {
  if (!sql) {
    return NextResponse.json({ data: FALLBACK_SITES });
  }

  try {
    const rows = await sql`
      SELECT s.site_id AS id, s.name, s.site_id AS code,
        c.name AS customer_name,
        COUNT(DISTINCT r.equipment_id) FILTER (WHERE r.end_date IS NULL)::int AS active_equipment_count
      FROM sites s
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN rentals r ON r.site_id = s.site_id
      GROUP BY s.site_id, s.name, c.name
      ORDER BY s.name ASC
    `;
    return NextResponse.json({ data: rows.map((rawRow) => {
      const row = rawRow as unknown as SiteRow;
      return {
        id: row.id,
        name: row.name || row.code,
        code: row.code,
        customerName: row.customer_name || null,
        activeEquipmentCount: row.active_equipment_count,
      };
    }) });
  } catch (error) {
    console.error("Error fetching sites (using fallback):", error);
    return NextResponse.json({ data: FALLBACK_SITES });
  }
}
