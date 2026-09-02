import { NextResponse } from "next/server";
import { findAsset } from "@/lib/server/equipment-query";
import { sql } from "@/lib/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  const { id } = await params;
  try {
    const asset = await findAsset(sql, id.toUpperCase());
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json({ data: asset });
  } catch (error) {
    console.error("Error fetching asset:", error);
    return NextResponse.json({ error: "Unable to load asset" }, { status: 500 });
  }
}
