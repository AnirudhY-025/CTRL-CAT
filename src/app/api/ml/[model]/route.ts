import { NextResponse } from 'next/server';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

export async function POST(
  request: Request,
  { params }: { params: { model: string } }
) {
  try {
    const model = params.model; // e.g., 'utilization', 'anomaly', 'maintenance', 'demand'
    
    // Ensure we only proxy valid routes
    const validModels = ['utilization', 'anomaly', 'maintenance', 'demand'];
    if (!validModels.includes(model)) {
      return NextResponse.json({ error: 'Invalid model requested' }, { status: 400 });
    }

    const body = await request.json();

    const response = await fetch(`${FASTAPI_URL}/predict/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // 5-second timeout for ML inference
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error(`FastAPI error (${response.status}):`, await response.text());
      return NextResponse.json(
        { error: 'ML service error' }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Next.js API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to ML service' },
      { status: 500 }
    );
  }
}
