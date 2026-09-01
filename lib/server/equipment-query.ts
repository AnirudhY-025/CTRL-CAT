import { assetFromRow, type AssetRow } from "./assets";

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

const equipmentQuery = async (database: Sql, equipmentId?: string) => {
  if (equipmentId) {
    const rows = (await database`
      SELECT
        e.equipment_id, e.equipment_type, e.display_name, e.serial_number,
        e.age_years, e.operator_id, e.location, e.condition, e.legacy_status,
        e.engine_hours_per_day, e.idle_hours_per_day,
        r.rental_id, r.site_id, r.start_date, r.end_date AS rental_end_date,
        r.operator_id AS rental_operator_id, r.location AS rental_location,
        o.name AS operator_name, s.name AS site_name, s.site_type,
        d.date AS last_active_date, d.utilization_pct, d.engine_hours,
        d.idle_hours, d.fuel_level_pct, d.dtc_warning_active,
        d.sos_fluid_alert, d.is_anomaly, d.total_hours
      FROM equipment e
      LEFT JOIN LATERAL (
        SELECT * FROM rentals
        WHERE equipment_id = e.equipment_id AND end_date IS NULL
        ORDER BY start_date DESC LIMIT 1
      ) r ON true
      LEFT JOIN sites s ON s.site_id = COALESCE(r.site_id, e.site_id)
      LEFT JOIN operators o ON o.operator_id = COALESCE(r.operator_id, e.operator_id)
      LEFT JOIN LATERAL (
        SELECT * FROM daily_usage
        WHERE equipment_id = e.equipment_id
        ORDER BY date DESC LIMIT 1
      ) d ON true
      WHERE e.equipment_id = ${equipmentId}
      LIMIT 1
    `) as AssetRow[];
    return rows;
  }

  return database`
    SELECT
      e.equipment_id, e.equipment_type, e.display_name, e.serial_number,
      e.age_years, e.operator_id, e.location, e.condition, e.legacy_status,
      e.engine_hours_per_day, e.idle_hours_per_day,
      r.rental_id, r.site_id, r.start_date, r.end_date AS rental_end_date,
      r.operator_id AS rental_operator_id, r.location AS rental_location,
      o.name AS operator_name, s.name AS site_name, s.site_type,
      d.date AS last_active_date, d.utilization_pct, d.engine_hours,
      d.idle_hours, d.fuel_level_pct, d.dtc_warning_active,
      d.sos_fluid_alert, d.is_anomaly, d.total_hours
    FROM equipment e
    LEFT JOIN LATERAL (
      SELECT * FROM rentals
      WHERE equipment_id = e.equipment_id AND end_date IS NULL
      ORDER BY start_date DESC LIMIT 1
    ) r ON true
    LEFT JOIN sites s ON s.site_id = COALESCE(r.site_id, e.site_id)
    LEFT JOIN operators o ON o.operator_id = COALESCE(r.operator_id, e.operator_id)
    LEFT JOIN LATERAL (
      SELECT * FROM daily_usage
      WHERE equipment_id = e.equipment_id
      ORDER BY date DESC LIMIT 1
    ) d ON true
    ORDER BY e.equipment_id ASC
  ` as Promise<AssetRow[]>;
};

export async function listAssets(database: Sql) {
  const rows = await equipmentQuery(database);
  return rows.map((row: AssetRow) => assetFromRow(row));
}

export async function findAsset(database: Sql, equipmentId: string) {
  const rows = await equipmentQuery(database, equipmentId);
  return rows[0] ? assetFromRow(rows[0]) : null;
}

export async function findAssetRow(database: Sql, equipmentId: string) {
  const rows = await equipmentQuery(database, equipmentId);
  return rows[0] || null;
}
