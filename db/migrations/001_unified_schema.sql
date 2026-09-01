-- Canonical schema for both the legacy customer portal and normalized ML data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Normalize the legacy UUID-oriented tables before adding canonical columns.
DO $$
BEGIN
  IF to_regclass('public.sites') IS NOT NULL
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'site_id') THEN
    ALTER TABLE sites RENAME COLUMN id TO site_id;
  END IF;
  IF to_regclass('public.equipment') IS NOT NULL
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'equipment_id') THEN
    ALTER TABLE equipment RENAME COLUMN id TO equipment_id;
  END IF;
  IF to_regclass('public.equipment') IS NOT NULL
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'type')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'equipment_type') THEN
    ALTER TABLE equipment RENAME COLUMN type TO equipment_type;
  END IF;
  IF to_regclass('public.equipment') IS NOT NULL
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'status')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'legacy_status') THEN
    ALTER TABLE equipment RENAME COLUMN status TO legacy_status;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'site_id') THEN
    ALTER TABLE sites ALTER COLUMN site_id TYPE VARCHAR(50) USING site_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'equipment_id') THEN
    ALTER TABLE equipment ALTER COLUMN equipment_id TYPE VARCHAR(50) USING equipment_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment' AND column_name = 'site_id') THEN
    ALTER TABLE equipment ALTER COLUMN site_id TYPE VARCHAR(50) USING site_id::text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  site_id VARCHAR(50) PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  name VARCHAR(150) NOT NULL,
  site_type VARCHAR(50) NOT NULL DEFAULT 'jobsite',
  base_demand DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS operators (
  operator_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150),
  experience_years DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS equipment (
  equipment_id VARCHAR(50) PRIMARY KEY,
  equipment_type VARCHAR(80) NOT NULL,
  display_name VARCHAR(150),
  serial_number VARCHAR(100),
  age_years DOUBLE PRECISION NOT NULL DEFAULT 0,
  site_id VARCHAR(50) REFERENCES sites(site_id),
  operator_id VARCHAR(50) REFERENCES operators(operator_id),
  location VARCHAR(200),
  condition VARCHAR(30) NOT NULL DEFAULT 'Good',
  legacy_status VARCHAR(50),
  check_out_date DATE,
  check_in_date DATE,
  engine_hours_per_day DOUBLE PRECISION,
  idle_hours_per_day DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rentals (
  rental_id VARCHAR(80) PRIMARY KEY,
  equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
  site_id VARCHAR(50) NOT NULL REFERENCES sites(site_id),
  operator_id VARCHAR(50) REFERENCES operators(operator_id),
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  location VARCHAR(200),
  return_condition VARCHAR(30),
  return_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rentals_equipment_history
  ON rentals(equipment_id, start_date DESC);

CREATE TABLE IF NOT EXISTS maintenance (
  maintenance_id VARCHAR(80) PRIMARY KEY,
  equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
  date DATE NOT NULL,
  downtime_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  cost DOUBLE PRECISION NOT NULL DEFAULT 0,
  hours_at_maint DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_usage (
  date DATE NOT NULL,
  equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
  rental_id VARCHAR(80),
  site_id VARCHAR(50) REFERENCES sites(site_id),
  operator_id VARCHAR(50) REFERENCES operators(operator_id),
  utilization_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  engine_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  idle_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  fuel_consumed DOUBLE PRECISION NOT NULL DEFAULT 0,
  fuel_level_pct DOUBLE PRECISION,
  payload_tons DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  dtc_warning_active BOOLEAN NOT NULL DEFAULT false,
  sos_fluid_alert BOOLEAN NOT NULL DEFAULT false,
  is_anomaly BOOLEAN NOT NULL DEFAULT false,
  had_maintenance BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (date, equipment_id)
);

CREATE INDEX IF NOT EXISTS daily_usage_equipment_history
  ON daily_usage(equipment_id, date DESC);
CREATE INDEX IF NOT EXISTS daily_usage_site_history
  ON daily_usage(site_id, date DESC);

CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id VARCHAR(50) NOT NULL REFERENCES equipment(equipment_id),
  event_type VARCHAR(80) NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compatibility additions for databases created from the normalized schema.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS site_type VARCHAR(50) NOT NULL DEFAULT 'jobsite';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS base_demand DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE operators ADD COLUMN IF NOT EXISTS name VARCHAR(150);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS display_name VARCHAR(150);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS site_id VARCHAR(50) REFERENCES sites(site_id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS operator_id VARCHAR(50) REFERENCES operators(operator_id);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS condition VARCHAR(30) NOT NULL DEFAULT 'Good';
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS legacy_status VARCHAR(50);
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS check_out_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS engine_hours_per_day DOUBLE PRECISION;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS idle_hours_per_day DOUBLE PRECISION;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS operator_id VARCHAR(50) REFERENCES operators(operator_id);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS location VARCHAR(200);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS return_condition VARCHAR(30);
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS return_notes TEXT;
ALTER TABLE daily_usage ADD COLUMN IF NOT EXISTS fuel_level_pct DOUBLE PRECISION;

-- Legacy CTRL-CAT imports stored boolean telemetry flags as 0/1 integers.
-- Convert them before loading the canonical boolean seed values.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_usage'
      AND column_name = 'dtc_warning_active'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE daily_usage
      ALTER COLUMN dtc_warning_active TYPE BOOLEAN
      USING dtc_warning_active <> 0;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_usage'
      AND column_name = 'sos_fluid_alert'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE daily_usage
      ALTER COLUMN sos_fluid_alert TYPE BOOLEAN
      USING sos_fluid_alert <> 0;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_usage'
      AND column_name = 'is_anomaly'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE daily_usage
      ALTER COLUMN is_anomaly TYPE BOOLEAN
      USING is_anomaly <> 0;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_usage'
      AND column_name = 'had_maintenance'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE daily_usage
      ALTER COLUMN had_maintenance TYPE BOOLEAN
      USING had_maintenance <> 0;
  END IF;
END $$;

-- Existing normalized rentals only had a start date. Close historical rows so
-- the active-rental uniqueness rule can be applied safely.
UPDATE rentals r
SET end_date = (
  SELECT r2.start_date
  FROM rentals r2
  WHERE r2.equipment_id = r.equipment_id
    AND r2.start_date > r.start_date
  ORDER BY r2.start_date ASC
  LIMIT 1
)
WHERE r.end_date IS NULL
  AND EXISTS (
    SELECT 1 FROM rentals r2
    WHERE r2.equipment_id = r.equipment_id
      AND r2.start_date > r.start_date
  );

CREATE UNIQUE INDEX IF NOT EXISTS rentals_one_active_per_equipment
  ON rentals(equipment_id) WHERE end_date IS NULL;
