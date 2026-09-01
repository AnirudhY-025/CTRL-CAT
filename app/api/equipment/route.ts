import { NextResponse } from "next/server";

import { listAssets } from "@/lib/server/equipment-query";
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
