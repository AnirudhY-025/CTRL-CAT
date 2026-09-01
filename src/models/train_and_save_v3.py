import pandas as pd
import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest, RandomForestRegressor

def train_and_save():
    v3_dir = r"c:\Users\yekka\Desktop\CAT_Models\data\raw\v3_cat"
    out_dir = r"c:\Users\yekka\Desktop\CAT_Models\models\v3_models"
    
    usage = pd.read_csv(os.path.join(v3_dir, "daily_usage.csv"))
    usage['date'] = pd.to_datetime(usage['date'])
    equip = pd.read_csv(os.path.join(v3_dir, "equipment.csv"))
    
    print("Training Model 1: Utilization Predictor...")
    # Group by week for Model 1
    usage['week'] = usage['date'].dt.to_period('W').dt.start_time
    weekly = usage.groupby(['equipment_id', 'week']).agg({
        'utilization_pct': 'mean', 'engine_hours': 'mean', 'idle_hours': 'mean', 'fuel_consumed': 'mean'
    }).reset_index()
    weekly = pd.merge(weekly, equip[['equipment_id', 'age_years']], on='equipment_id', how='left')
    weekly['next_util'] = weekly.groupby('equipment_id')['utilization_pct'].shift(-1)
    weekly = weekly.dropna(subset=['next_util'])
    
    def cat_util(u):
        if u < 35: return 'Under-utilized'
        elif u > 75: return 'Over-utilized'
        return 'Optimal'
    
    weekly['target'] = weekly['next_util'].apply(cat_util)
    m1_features = ['engine_hours', 'idle_hours', 'fuel_consumed', 'utilization_pct', 'age_years']
    rf_util = RandomForestClassifier(n_estimators=50, random_state=42, class_weight='balanced')
    rf_util.fit(weekly[m1_features], weekly['target'])
    joblib.dump(rf_util, os.path.join(out_dir, "m1_utilization.pkl"))
    
    print("Training Model 2: Anomaly Detector...")
    active = usage[usage['engine_hours'] > 0].copy()
    active['fuel_per_hour'] = active['fuel_consumed'] / (active['engine_hours'] + 1e-5)
    m2_features = ['fuel_per_hour', 'utilization_pct', 'idle_hours']
    iso = IsolationForest(contamination=0.01, random_state=42)
    iso.fit(active[m2_features])
    joblib.dump(iso, os.path.join(out_dir, "m2_anomaly.pkl"))
    
    print("Training Model 3: Predictive Maintenance...")
    usage = usage.sort_values(['equipment_id', 'date'])
    usage['maint_next_7d'] = usage.groupby('equipment_id')['had_maintenance'].transform(lambda x: x.rolling(7, min_periods=1).max().shift(-7))
    usage['roll_dtc_3d'] = usage.groupby('equipment_id')['dtc_warning_active'].transform(lambda x: x.rolling(3, min_periods=1).sum())
    usage['roll_sos_3d'] = usage.groupby('equipment_id')['sos_fluid_alert'].transform(lambda x: x.rolling(3, min_periods=1).sum())
    usage['roll_hours'] = usage.groupby('equipment_id')['engine_hours'].transform(lambda x: x.rolling(14, min_periods=1).sum())
    
    maint_df = usage.dropna(subset=['maint_next_7d'])
    m3_features = ['total_hours', 'roll_hours', 'utilization_pct', 'roll_dtc_3d', 'roll_sos_3d']
    rf_maint = RandomForestClassifier(n_estimators=50, random_state=42, class_weight='balanced')
    rf_maint.fit(maint_df[m3_features], maint_df['maint_next_7d'])
    joblib.dump(rf_maint, os.path.join(out_dir, "m3_maintenance.pkl"))
    
    print("Training Model 4: Demand Forecaster...")
    demand = usage.groupby(['site_id', 'week'])['equipment_id'].nunique().reset_index()
    demand.columns = ['site_id', 'week', 'active_equip_count']
    demand['next_week_demand'] = demand.groupby('site_id')['active_equip_count'].shift(-1)
    demand['prev_week_demand'] = demand.groupby('site_id')['active_equip_count'].shift(1).fillna(demand['active_equip_count'])
    demand = demand.dropna(subset=['next_week_demand'])
    
    m4_features = ['active_equip_count', 'prev_week_demand']
    rf_demand = RandomForestRegressor(n_estimators=50, random_state=42)
    rf_demand.fit(demand[m4_features], demand['next_week_demand'])
    joblib.dump(rf_demand, os.path.join(out_dir, "m4_demand.pkl"))
    
    print("All 4 models successfully saved to .pkl files!")

if __name__ == "__main__":
    train_and_save()
