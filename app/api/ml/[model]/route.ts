import { NextResponse } from "next/server";

const fastApiUrl = process.env.FASTAPI_URL || "http://localhost:8000";
const validModels = new Set(["utilization", "anomaly", "maintenance", "demand"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ model: string }> },
) {
  const { model } = await params;
  if (!validModels.has(model)) {
    return NextResponse.json({ error: "Invalid model requested" }, { status: 400 });
  }

  try {
    const response = await fetch(`${fastApiUrl}/predict/${model}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await request.json()),
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || "ML service error" }, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML service proxy error:", error);
    return NextResponse.json({ error: "Failed to connect to ML service" }, { status: 503 });
  }
}
