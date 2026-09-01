import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const results = await sql`
      SELECT 
        e.equipment_id,
        e.equipment_type,
        e.age_years,
        r.rental_id,
        r.site_id,
        r.start_date,
        s.site_type,
        d.date as last_active_date,
        d.utilization_pct,
        d.engine_hours,
        d.idle_hours,
        d.fuel_consumed,
        d.dtc_warning_active,
        d.sos_fluid_alert,
        d.is_anomaly,
        d.total_hours
      FROM equipment e
      LEFT JOIN LATERAL (
        SELECT rental_id, site_id, start_date 
        FROM rentals 
        WHERE equipment_id = e.equipment_id 
        ORDER BY start_date DESC 
        LIMIT 1
      ) r ON true
      LEFT JOIN sites s ON r.site_id = s.site_id
      LEFT JOIN LATERAL (
        SELECT * 
        FROM daily_usage 
        WHERE equipment_id = e.equipment_id 
        ORDER BY date DESC 
        LIMIT 1
      ) d ON true
      ORDER BY e.equipment_id ASC
      LIMIT ${limit}
    `;

    return NextResponse.json({ data: results });
  } catch (error: any) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
