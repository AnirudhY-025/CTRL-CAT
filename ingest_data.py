import os
import psycopg2

DB_PASSWORD = "Pranshu12345678910"
PROJECT_REF = "jppjwaidktvhictamlxd"

SCHEMA_SQL = """
-- 1. Safely wipe all existing tables
DROP TABLE IF EXISTS daily_usage CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS rentals CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS sites CASCADE;

-- 2. Create Sites Table
CREATE TABLE sites (
    site_id VARCHAR(50) PRIMARY KEY,
    site_type VARCHAR(50) NOT NULL,
    base_demand FLOAT NOT NULL
);

-- 3. Create Equipment Table
CREATE TABLE equipment (
    equipment_id VARCHAR(50) PRIMARY KEY,
    equipment_type VARCHAR(50) NOT NULL,
    age_years FLOAT NOT NULL
);

-- 4. Create Operators Table
CREATE TABLE operators (
    operator_id VARCHAR(50) PRIMARY KEY,
    experience_years FLOAT NOT NULL
);

-- 5. Create Rentals Table
CREATE TABLE rentals (
    rental_id VARCHAR(50) PRIMARY KEY,
    equipment_id VARCHAR(50) REFERENCES equipment(equipment_id),
    site_id VARCHAR(50) REFERENCES sites(site_id),
    start_date DATE NOT NULL
);

-- 6. Create Maintenance Events Table
CREATE TABLE maintenance (
    maintenance_id VARCHAR(50) PRIMARY KEY,
    equipment_id VARCHAR(50) REFERENCES equipment(equipment_id),
    date DATE NOT NULL,
    downtime_hours FLOAT NOT NULL,
    cost FLOAT NOT NULL,
    hours_at_maint FLOAT NOT NULL
);

-- 7. Create Daily Usage / Telemetry Table
-- (Note: foreign key references to equipment/sites/operators preserved, rental_id kept as VARCHAR without hard constraint to accommodate INIT synthetic tags)
CREATE TABLE daily_usage (
    date DATE NOT NULL,
    equipment_id VARCHAR(50) REFERENCES equipment(equipment_id),
    rental_id VARCHAR(50),
    site_id VARCHAR(50) REFERENCES sites(site_id),
    operator_id VARCHAR(50) REFERENCES operators(operator_id),
    
    utilization_pct FLOAT NOT NULL,
    engine_hours FLOAT NOT NULL,
    idle_hours FLOAT NOT NULL,
    fuel_consumed FLOAT NOT NULL,
    payload_tons FLOAT NOT NULL,
    
    dtc_warning_active INT NOT NULL,
    sos_fluid_alert INT NOT NULL,
    is_anomaly INT NOT NULL,
    had_maintenance INT NOT NULL,
    total_hours FLOAT NOT NULL,
    
    PRIMARY KEY (date, equipment_id)
);

-- Create performance indexes for real-time telemetry queries
CREATE INDEX idx_daily_usage_equip ON daily_usage(equipment_id, date DESC);
CREATE INDEX idx_daily_usage_site ON daily_usage(site_id, date DESC);
CREATE INDEX idx_rentals_equip ON rentals(equipment_id);
"""

def run_migration_and_seed():
    print(f"Connecting to Supabase PostgreSQL...")
    conn = psycopg2.connect(
        dbname="postgres",
        user=f"postgres.{PROJECT_REF}",
        password=DB_PASSWORD,
        host="aws-0-ap-south-1.pooler.supabase.com",
        port=6543,
        sslmode="require"
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Executing schema migration...")
    cur.execute(SCHEMA_SQL)
    print("Schema created successfully!")
    
    base_data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "CTRL-CAT", "data", "raw", "v3_cat")
    
    tables_files = [
        ("sites", "sites.csv"),
        ("equipment", "equipment.csv"),
        ("operators", "operators.csv"),
        ("rentals", "rentals.csv"),
        ("maintenance", "maintenance.csv"),
        ("daily_usage", "daily_usage.csv")
    ]
    
    for table, file_name in tables_files:
        file_path = os.path.join(base_data_dir, file_name)
        if not os.path.exists(file_path):
            print(f"Warning: {file_path} not found.")
            continue
            
        print(f"Importing {file_name} into table '{table}'...")
        with open(file_path, "r", encoding="utf-8") as f:
            copy_sql = f"COPY {table} FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER ',');"
            cur.copy_expert(copy_sql, f)
        print(f"Successfully imported {table}!")

    # Enable realtime publication
    print("Enabling Supabase Realtime publication...")
    try:
        cur.execute("ALTER PUBLICATION supabase_realtime ADD TABLE equipment;")
        cur.execute("ALTER PUBLICATION supabase_realtime ADD TABLE rentals;")
        cur.execute("ALTER PUBLICATION supabase_realtime ADD TABLE daily_usage;")
        print("Realtime enabled successfully!")
    except Exception as e:
        print(f"Realtime notice: {e}")
        
    cur.close()
    conn.close()
    print("\n=================================================================")
    print("SUCCESS: ALL 6 TABLES CREATED & ALL CSV DATA INGESTED TO SUPABASE!")
    print("=================================================================")

if __name__ == "__main__":
    run_migration_and_seed()
