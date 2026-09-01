import { NextResponse } from "next/server";

import { sql } from "@/lib/server/db";
import type { DemandForecast } from "@/lib/types";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://127.0.0.1:8000";

const FALLBACK_DEMAND: DemandForecast = [
  { siteName: "Riverbend Materials (Sobha)", currentCount: 3, predictedNextWeek: 7, delta: 4 },
  { siteName: "Northline Expansion (Prestige)", currentCount: 2, predictedNextWeek: 3, delta: 1 },
  { siteName: "Westport Logistics (L&T)", currentCount: 3, predictedNextWeek: 2, delta: -1 },
  { siteName: "Central Rental Yard", currentCount: 4, predictedNextWeek: 4, delta: 0 },
];

export async function GET() {
  if (!sql) {
    return NextResponse.json({ data: FALLBACK_DEMAND });
  }

  try {
    // Gather per-site demand context from Neon
    const siteRows = await sql`
      SELECT
        s.name                                          AS site_name,
        COUNT(DISTINCT e.equipment_id)                  AS active_equip_count,
        COUNT(DISTINCT CASE WHEN r.end_date IS NULL THEN r.rental_id END) AS prev_week_demand
      FROM sites s
      LEFT JOIN rentals r ON r.site_id = s.site_id
      LEFT JOIN equipment e ON e.equipment_id = r.equipment_id
      GROUP BY s.name
      ORDER BY s.name
    ` as { site_name: string; active_equip_count: number; prev_week_demand: number }[];

    // Call FastAPI demand endpoint for each site
    const results = await Promise.allSettled(
      siteRows.map(async (site) => {
        const response = await fetch(`${FASTAPI_URL}/predict/demand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            active_equip_count: Number(site.active_equip_count),
            prev_week_demand: Number(site.prev_week_demand),
          }),
        });
        const json = (await response.json()) as { predicted_next_week_demand: number };
        const predicted = json.predicted_next_week_demand;
        return {
          siteName: site.site_name,
          currentCount: Number(site.active_equip_count),
          predictedNextWeek: predicted,
          delta: predicted - Number(site.prev_week_demand),
        };
      }),
    );

    const forecast: DemandForecast = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<DemandForecast[number]>).value);

    return NextResponse.json({ data: forecast.length > 0 ? forecast : FALLBACK_DEMAND });
  } catch (error) {
    console.error("Error generating demand forecast (using fallback):", error);
    return NextResponse.json({ data: FALLBACK_DEMAND });
  }
}
