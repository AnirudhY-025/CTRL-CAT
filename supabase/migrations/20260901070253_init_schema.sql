-- 1. Sites Table
CREATE TABLE sites (
    site_id VARCHAR(50) PRIMARY KEY,
    site_type VARCHAR(50) NOT NULL,
    base_demand FLOAT NOT NULL
);

-- 2. Equipment Table
CREATE TABLE equipment (
    equipment_id VARCHAR(50) PRIMARY KEY,
    equipment_type VARCHAR(50) NOT NULL,
    age_years FLOAT NOT NULL
);

-- 3. Operators Table
CREATE TABLE operators (
    operator_id VARCHAR(50) PRIMARY KEY,
    experience_years FLOAT NOT NULL
);

-- 4. Rentals Table
CREATE TABLE rentals (
    rental_id VARCHAR(50) PRIMARY KEY,
    equipment_id VARCHAR(50) REFERENCES equipment(equipment_id),
    site_id VARCHAR(50) REFERENCES sites(site_id),
    start_date DATE NOT NULL
);

-- 5. Maintenance Events Table
CREATE TABLE maintenance (
    maintenance_id VARCHAR(50) PRIMARY KEY,
    equipment_id VARCHAR(50) REFERENCES equipment(equipment_id),
    date DATE NOT NULL,
    downtime_hours FLOAT NOT NULL,
    cost FLOAT NOT NULL,
    hours_at_maint FLOAT NOT NULL
);

-- 6. Daily Usage / Telemetry Table
CREATE TABLE daily_usage (
    date DATE NOT NULL,
    equipment_id VARCHAR(50) REFERENCES equipment(equipment_id),
    rental_id VARCHAR(50) REFERENCES rentals(rental_id),
    site_id VARCHAR(50) REFERENCES sites(site_id),
    operator_id VARCHAR(50) REFERENCES operators(operator_id),
    
    -- Operational Metrics
    utilization_pct FLOAT NOT NULL,
    engine_hours FLOAT NOT NULL,
    idle_hours FLOAT NOT NULL,
    fuel_consumed FLOAT NOT NULL,
    payload_tons FLOAT NOT NULL,
    total_hours FLOAT NOT NULL,
    
    -- CAT Telemetry / Condition Monitoring Flags
    dtc_warning_active BOOLEAN NOT NULL,
    sos_fluid_alert BOOLEAN NOT NULL,
    
    -- Ground Truth Labels (For Model Evaluation)
    is_anomaly BOOLEAN NOT NULL,
    had_maintenance BOOLEAN NOT NULL,
    
    -- Composite Primary Key (One record per machine per day)
    PRIMARY KEY (date, equipment_id)
);

-- Enable Realtime for Dashboard Updates
ALTER PUBLICATION supabase_realtime ADD TABLE equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE rentals;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_usage;
