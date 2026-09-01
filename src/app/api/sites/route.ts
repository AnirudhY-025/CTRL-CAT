import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    if (!sql) {
      return NextResponse.json({ error: 'Database connection not configured' }, { status: 500 });
    }

    const sites = await sql`
      SELECT 
        s.*,
        COUNT(DISTINCT r.equipment_id) as active_equipment_count
      FROM sites s
      LEFT JOIN rentals r ON s.site_id = r.site_id
      GROUP BY s.site_id, s.site_type, s.base_demand
      ORDER BY s.site_id ASC
    `;

    return NextResponse.json({ data: sites });
  } catch (error: any) {
    console.error('Error fetching sites:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
