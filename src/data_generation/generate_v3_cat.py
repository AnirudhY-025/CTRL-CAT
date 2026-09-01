import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta

def generate_cat_data():
    np.random.seed(42)
    output_dir = r"c:\Users\yekka\Desktop\CAT_Models\data\raw\v3_cat"
    os.makedirs(output_dir, exist_ok=True)
    
    print("Generating CAT-specific Datasets...")
    
    num_sites = 20
    sites = pd.DataFrame({
        'site_id': [f"S_{i:03d}" for i in range(num_sites)],
        'site_type': np.random.choice(['Construction', 'Mining', 'Infrastructure'], num_sites),
        'base_demand': np.random.uniform(5, 20, num_sites)
    })
    
    num_equip = 300
    equipment = pd.DataFrame({
        'equipment_id': [f"EQ_{i:04d}" for i in range(num_equip)],
        'equipment_type': np.random.choice(['Excavator', 'Bulldozer', 'Crane', 'Dump Truck'], num_equip),
        'age_years': np.random.uniform(0, 15, num_equip),
    })
    
    num_operators = 100
    operators = pd.DataFrame({
        'operator_id': [f"OP_{i:03d}" for i in range(num_operators)],
        'experience_years': np.random.uniform(1, 25, num_operators)
    })
    
    start_date = datetime(2024, 1, 1)
    days = 730
    
    usage_records, maintenance_records, rental_records = [], [], []
    
    # State tracking
    eq_state = {
        row.equipment_id: {
            'utilization': np.random.uniform(20, 90),
            'site_id': np.random.choice(sites['site_id']),
            'operator_id': np.random.choice(operators['operator_id']),
            'hours_since_maint': np.random.uniform(0, 1000),
            'total_hours': np.random.uniform(1000, 5000),
            'rental_id': f"R_{row.equipment_id}_INIT",
            'days_to_breakdown': -1 # -1 means healthy
        } for _, row in equipment.iterrows()
    }
    
    rental_counter, maint_counter = 0, 0
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        site_demand_multiplier = {s: 1.5 + 0.8 * np.sin(day / 60.0 + i) for i, s in enumerate(sites['site_id'])}
        
        for eq in equipment.itertuples():
            state = eq_state[eq.equipment_id]
            
            # Site switching
            if np.random.rand() < 0.05:
                rental_counter += 1
                state['site_id'] = np.random.choice(sites['site_id'])
                state['operator_id'] = np.random.choice(operators['operator_id'])
                state['rental_id'] = f"R_{current_date.strftime('%Y%m%d')}_{rental_counter:04d}"
                rental_records.append({
                    'rental_id': state['rental_id'],
                    'equipment_id': eq.equipment_id,
                    'site_id': state['site_id'],
                    'start_date': current_date.strftime('%Y-%m-%d')
                })
            
            # Utilization logic
            target_util = 55 + (site_demand_multiplier[state['site_id']] * 15) - (eq.age_years * 1.5)
            if np.random.rand() < 0.04: target_util = np.random.uniform(85, 100)
            if np.random.rand() < 0.04: target_util = np.random.uniform(0, 20)
            
            state['utilization'] = 0.8 * state['utilization'] + 0.2 * target_util + np.random.normal(0, 5)
            state['utilization'] = np.clip(state['utilization'], 0, 100)
            
            engine_hours = (state['utilization'] / 100) * 12
            idle_hours = np.random.uniform(0, 2) + (engine_hours * 0.1)
            fuel = engine_hours * np.random.uniform(10, 15)
            
            # CAT Payload Feature
            payload_tons = (engine_hours / 12) * np.random.uniform(500, 1500) if eq.equipment_type in ['Dump Truck', 'Excavator'] else 0
            
            # Anomalies
            is_anomaly = 0
            if np.random.rand() < 0.01:
                is_anomaly = 1
                if np.random.rand() < 0.5: fuel *= np.random.uniform(2, 4)
                else: idle_hours += 8
                    
            state['hours_since_maint'] += engine_hours
            state['total_hours'] += engine_hours
            
            # ----------------------------------------------------
            # CAT CONDITION MONITORING & MAINTENANCE LOGIC
            # ----------------------------------------------------
            dtc_warning_active = 0
            sos_fluid_alert = 0
            has_maintenance = 0
            
            # If healthy, check if a failure begins to develop
            if state['days_to_breakdown'] == -1:
                maint_prob = 1 / (1 + np.exp(-(state['hours_since_maint'] - 600) / 50))
                if np.random.rand() < maint_prob * 0.05: # Failure sequence begins
                    state['days_to_breakdown'] = np.random.randint(3, 10)
            
            # If failure is developing, trigger warnings
            if state['days_to_breakdown'] > 0:
                # SOS Fluid Alert triggers a few days before failure
                if state['days_to_breakdown'] <= 7 and np.random.rand() < 0.8:
                    sos_fluid_alert = 1
                # DTC (Diagnostic Trouble Codes) trigger very close to failure
                if state['days_to_breakdown'] <= 4 and np.random.rand() < 0.9:
                    dtc_warning_active = 1
                    
                state['days_to_breakdown'] -= 1
                
            # Breakdown day
            elif state['days_to_breakdown'] == 0:
                has_maintenance = 1
                maint_counter += 1
                maintenance_records.append({
                    'maintenance_id': f"M_{maint_counter:05d}",
                    'equipment_id': eq.equipment_id,
                    'date': current_date.strftime('%Y-%m-%d'),
                    'downtime_hours': np.random.uniform(12, 72),
                    'cost': np.random.uniform(1000, 10000),
                    'hours_at_maint': state['hours_since_maint']
                })
                # Reset state after maintenance
                state['hours_since_maint'] = 0
                state['utilization'] = 0
                state['days_to_breakdown'] = -1
                engine_hours, fuel, idle_hours, payload_tons = 0, 0, 0, 0
                dtc_warning_active, sos_fluid_alert = 0, 0
                
            usage_records.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'equipment_id': eq.equipment_id,
                'rental_id': state['rental_id'],
                'site_id': state['site_id'],
                'operator_id': state['operator_id'],
                'utilization_pct': state['utilization'],
                'engine_hours': engine_hours,
                'idle_hours': idle_hours,
                'fuel_consumed': fuel,
                'payload_tons': payload_tons,
                'dtc_warning_active': dtc_warning_active,
                'sos_fluid_alert': sos_fluid_alert,
                'is_anomaly': is_anomaly,
                'had_maintenance': has_maintenance,
                'total_hours': state['total_hours']
            })
            
    print("Saving CAT telemetry datasets...")
    pd.DataFrame(usage_records).to_csv(os.path.join(output_dir, "daily_usage.csv"), index=False)
    pd.DataFrame(maintenance_records).to_csv(os.path.join(output_dir, "maintenance.csv"), index=False)
    pd.DataFrame(rental_records).to_csv(os.path.join(output_dir, "rentals.csv"), index=False)
    equipment.to_csv(os.path.join(output_dir, "equipment.csv"), index=False)
    sites.to_csv(os.path.join(output_dir, "sites.csv"), index=False)
    operators.to_csv(os.path.join(output_dir, "operators.csv"), index=False)
    
    print("V3 (CAT) Generation Complete.")

if __name__ == "__main__":
    generate_cat_data()
