import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
    }

    const id = params.id;

    // Get equipment info
    const equipmentResult = await sql`
      SELECT * FROM equipment WHERE equipment_id = ${id} LIMIT 1
    `;

    if (!equipmentResult || equipmentResult.length === 0) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Get latest rental
    const rentalResult = await sql`
      SELECT r.*, s.site_type 
      FROM rentals r
      LEFT JOIN sites s ON r.site_id = s.site_id
      WHERE r.equipment_id = ${id}
      ORDER BY r.start_date DESC
      LIMIT 1
    `;

    // Get 14-day history of telemetry
    const telemetryHistory = await sql`
      SELECT * FROM daily_usage 
      WHERE equipment_id = ${id} 
      ORDER BY date DESC 
      LIMIT 14
    `;

    // Get maintenance history
    const maintenanceHistory = await sql`
      SELECT * FROM maintenance 
      WHERE equipment_id = ${id} 
      ORDER BY date DESC 
      LIMIT 5
    `;

    return NextResponse.json({
      equipment: equipmentResult[0],
      current_rental: rentalResult[0] || null,
      telemetry: telemetryHistory[0] || null,
      telemetry_history: telemetryHistory,
      maintenance_history: maintenanceHistory,
    });
  } catch (error: any) {
    console.error('Error fetching equipment detail:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
