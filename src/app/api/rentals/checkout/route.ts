import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/rentals/checkout - Operator check-out transaction
export async function POST(request: Request) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { equipment_id, operator_id, site_id } = body;

    if (!equipment_id || !site_id) {
      return NextResponse.json({ error: 'equipment_id and site_id are required' }, { status: 400 });
    }

    const rentalId = `R_${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];

    // Create new rental entry
    await sql`
      INSERT INTO rentals (rental_id, equipment_id, site_id, start_date)
      VALUES (${rentalId}, ${equipment_id}, ${site_id}, ${today})
    `;

    return NextResponse.json({
      success: true,
      rental_id: rentalId,
      message: `Machine ${equipment_id} successfully checked out at ${site_id}`,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
