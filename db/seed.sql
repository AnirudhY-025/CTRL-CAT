-- Seed data uses the canonical schema while retaining legacy UUID site IDs.
INSERT INTO customers (id, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Prestige Group'),
  ('22222222-2222-2222-2222-222222222222', 'Sobha Constructions'),
  ('33333333-3333-3333-3333-333333333333', 'L&T'),
  ('44444444-4444-4444-4444-444444444444', 'Godrej Properties')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sites (site_id, customer_id, name, site_type, base_demand) VALUES
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'S001', 'jobsite', 60),
  ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'S002', 'jobsite', 75),
  ('00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'S003', 'jobsite', 88),
  ('00000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'S004', 'jobsite', 55),
  ('00000000-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', 'S006', 'jobsite', 42),
  ('S_001', NULL, 'Rental yard', 'yard', 20),
  ('S_002', NULL, 'Northline Expansion', 'jobsite', 80),
  ('S_003', NULL, 'Riverbend Materials', 'jobsite', 70),
  ('S_004', NULL, 'Westport Logistics', 'jobsite', 65)
ON CONFLICT (site_id) DO UPDATE SET name = EXCLUDED.name, site_type = EXCLUDED.site_type, base_demand = EXCLUDED.base_demand;

INSERT INTO operators (operator_id, name, experience_years) VALUES
  ('OP101', 'Marcus Lee', 7),
  ('OP203', 'Daniel Ortiz', 5),
  ('OP301', 'Alicia Green', 4),
  ('OP114', 'Priya Nair', 9)
ON CONFLICT (operator_id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO equipment (equipment_id, equipment_type, display_name, serial_number, age_years, site_id, operator_id, location, condition, legacy_status, engine_hours_per_day, idle_hours_per_day) VALUES
  ('EQX1001', 'Excavator', 'CAT 320 GC Excavator', 'CAT-EQX1001', 4, 'S_002', 'OP101', 'Zone 4 · East cut', 'Good', 'Active', 1284, 186),
  ('EQX1002', 'Crane', 'CAT Crane', 'CAT-EQX1002', 6, 'S_001', NULL, 'Bay 02 · Ready line', 'Good', 'Overdue', 0, 11),
  ('EQX1003', 'Bulldozer', 'CAT D6T Dozer', 'CAT-EQX1003', 3, 'S_003', 'OP203', 'Crusher pad · South', 'Monitor', 'Active', 882, 94),
  ('EQX1004', 'Excavator', 'CAT 336 Excavator', 'CAT-EQX1004', 5, 'S_004', NULL, 'Service lane · 01', 'Service due', 'Safety Alert', 2, 9),
  ('EQX1005', 'Bulldozer', 'CAT D6T Dozer', 'CAT-EQX1005', 4, 'S_004', 'OP301', 'Dock 3 · Aggregate', 'Good', 'Active', 614, 73),
  ('EQX1006', 'Grader', 'CAT Grader', 'CAT-EQX1006', 2, 'S_001', NULL, 'Bay 03 · Ready line', 'Good', 'Active', 982, 131),
  ('EQX1007', 'Excavator', 'CAT Excavator', 'CAT-EQX1007', 7, 'S_001', NULL, 'Bay 08 · Inspection', 'Service due', 'Anomaly', 0, 12)
ON CONFLICT (equipment_id) DO UPDATE SET display_name = EXCLUDED.display_name, serial_number = EXCLUDED.serial_number, location = EXCLUDED.location, condition = EXCLUDED.condition, legacy_status = EXCLUDED.legacy_status;

INSERT INTO rentals (rental_id, equipment_id, site_id, operator_id, start_date, location)
VALUES
  ('R_EQX1001_ACTIVE', 'EQX1001', 'S_002', 'OP101', now() - interval '12 days', 'Zone 4 · East cut'),
  ('R_EQX1003_ACTIVE', 'EQX1003', 'S_003', 'OP203', now() - interval '3 days', 'Crusher pad · South'),
  ('R_EQX1005_ACTIVE', 'EQX1005', 'S_004', 'OP301', now() - interval '8 days', 'Dock 3 · Aggregate')
ON CONFLICT (rental_id) DO NOTHING;

INSERT INTO daily_usage (date, equipment_id, rental_id, site_id, operator_id, utilization_pct, engine_hours, idle_hours, fuel_consumed, fuel_level_pct, payload_tons, total_hours, dtc_warning_active, sos_fluid_alert, is_anomaly, had_maintenance)
VALUES
  (current_date, 'EQX1001', 'R_EQX1001_ACTIVE', 'S_002', 'OP101', 78, 8.4, 1.2, 68, 68, 0, 1284, false, false, false, false),
  (current_date, 'EQX1003', 'R_EQX1003_ACTIVE', 'S_003', 'OP203', 42, 5.1, 3.3, 59, 41, 0, 882, false, false, false, false),
  (current_date, 'EQX1004', NULL, 'S_004', NULL, 12, 2, 9, 18, 18, 0, 3466, true, true, true, false),
  (current_date, 'EQX1005', 'R_EQX1005_ACTIVE', 'S_004', 'OP301', 68, 7.4, 2.1, 77, 77, 0, 614, false, false, false, false)
ON CONFLICT (date, equipment_id) DO NOTHING;

INSERT INTO telemetry_events (equipment_id, event_type, description, payload)
VALUES ('EQX1004', 'Safety Alert', 'Operator Seatbelt Disengaged During Operation', '{"speed": 12, "seatbelt_engaged": false, "operator_detected": true}'::jsonb);
