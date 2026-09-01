import { NextResponse } from "next/server";

import { sql } from "@/lib/server/db";

type OperatorRow = { operator_id: string; name: string | null; experience_years: number | null };

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database connection not configured" }, { status: 503 });
  }

  try {
    const rows = await sql`SELECT operator_id, name, experience_years FROM operators ORDER BY name NULLS LAST, operator_id`;
    return NextResponse.json({ data: rows.map((rawRow) => {
      const row = rawRow as unknown as OperatorRow;
      return {
        id: row.operator_id,
        name: row.name || row.operator_id,
        initials: getInitials(row.name || row.operator_id),
        role: row.experience_years ? `${row.experience_years} years experience` : "Equipment operator",
      };
    }) });
  } catch (error) {
    console.error("Error fetching operators:", error);
    return NextResponse.json({ error: "Unable to load operators" }, { status: 500 });
  }
}
