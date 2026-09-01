-- Insert sample Customers (from the scenario)
INSERT INTO customers (id, name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Prestige Group'),
  ('22222222-2222-2222-2222-222222222222', 'Sobha Constructions'),
  ('33333333-3333-3333-3333-333333333333', 'L&T'),
  ('44444444-4444-4444-4444-444444444444', 'Godrej Properties');

-- Insert sample Sites mapping to Customers
INSERT INTO sites (id, customer_id, name) VALUES 
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'S001'),
  ('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'S002'),
  ('00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'S003'),
  ('00000000-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'S004'),
  ('00000000-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', 'S006');

-- Insert the exact Dataset from the Hackathon document
INSERT INTO equipment (id, type, site_id, check_out_date, check_in_date, engine_hours_per_day, idle_hours_per_day, operator_id, status) VALUES 
  ('EQX1001', 'Excavator', '00000000-0000-0000-0000-000000000003', '2025-04-01', '2025-04-16', 1.5, 10.0, 'OP101', 'Idle Risk'),
  ('EQX1002', 'Crane',     NULL,                                   '2025-03-10', '2025-03-30', 0.0, 11.0, NULL,    'Overdue'),
  ('EQX1003', 'Bulldozer', '00000000-0000-0000-0000-000000000002', '2025-02-15', '2025-03-11', 7.5, 0.5,  'OP203', 'Active'),
  ('EQX1004', 'Excavator', '00000000-0000-0000-0000-000000000004', '2025-05-05', '2025-05-15', 2.0, 9.0,  'OP106', 'Safety Alert'),
  ('EQX1005', 'Bulldozer', '00000000-0000-0000-0000-000000000006', '2025-01-01', '2025-01-31', 8.0, 0.0,  'OP301', 'Active'),
  ('EQX1006', 'Grader',    '00000000-0000-0000-0000-000000000001', '2025-04-05', '2025-04-23', 3.0, 6.0,  'OP114', 'Active'),
  ('EQX1007', 'Excavator', NULL,                                   '2025-03-20', '2025-04-01', 0.0, 12.0, NULL,    'Anomaly');

-- Insert a Mock Telemetry Event for the safety violation on EQX1004
INSERT INTO telemetry_events (equipment_id, event_type, description, payload) VALUES 
  ('EQX1004', 'Safety Alert', 'Operator Seatbelt Disengaged During Operation', '{"speed": 12, "seatbelt_engaged": false, "operator_detected": true}'::jsonb);
