import os
import joblib
import pandas as pd

class UtilizationPredictor:
    def __init__(self, model_dir="models/v3_models"):
        self.model = joblib.load(os.path.join(model_dir, "m1_utilization.pkl"))
        self.features = ['engine_hours', 'idle_hours', 'fuel_consumed', 'utilization_pct', 'age_years']
        
    def predict(self, telemetry_dict):
        df = pd.DataFrame([telemetry_dict])[self.features]
        pred = self.model.predict(df)[0]
        probs = self.model.predict_proba(df)[0]
        return {
            "prediction": pred,
            "confidence": float(max(probs)),
            "probabilities": {str(c): float(p) for c, p in zip(self.model.classes_, probs)}
        }

class AnomalyDetector:
    def __init__(self, model_dir="models/v3_models"):
        self.model = joblib.load(os.path.join(model_dir, "m2_anomaly.pkl"))
        self.features = ['fuel_per_hour', 'utilization_pct', 'idle_hours']
        
    def predict(self, telemetry_dict):
        # Calculate fuel_per_hour if not provided
        if 'fuel_per_hour' not in telemetry_dict:
            engine_hours = max(telemetry_dict.get('engine_hours', 1), 1e-5)
            telemetry_dict['fuel_per_hour'] = telemetry_dict.get('fuel_consumed', 0) / engine_hours
            
        df = pd.DataFrame([telemetry_dict])[self.features]
        # 1 means normal, -1 means anomaly in IsolationForest
        is_anomaly = self.model.predict(df)[0] == -1
        return {"is_anomaly": bool(is_anomaly)}

class MaintenancePredictor:
    def __init__(self, model_dir="models/v3_models"):
        self.model = joblib.load(os.path.join(model_dir, "m3_maintenance.pkl"))
        self.features = ['total_hours', 'roll_hours', 'utilization_pct', 'roll_dtc_3d', 'roll_sos_3d']
        
    def predict(self, telemetry_dict):
        df = pd.DataFrame([telemetry_dict])[self.features]
        pred = self.model.predict(df)[0]
        probs = self.model.predict_proba(df)[0]
        return {
            "maintenance_risk_7d": bool(pred == 1.0),
            "confidence": float(max(probs))
        }

class DemandForecaster:
    def __init__(self, model_dir="models/v3_models"):
        self.model = joblib.load(os.path.join(model_dir, "m4_demand.pkl"))
        self.features = ['active_equip_count', 'prev_week_demand']
        
    def predict(self, site_dict):
        df = pd.DataFrame([site_dict])[self.features]
        pred = self.model.predict(df)[0]
        return {"predicted_next_week_demand": round(float(pred))}

# ==========================================
# EXAMPLE USAGE (For Backend Integration)
# ==========================================
if __name__ == "__main__":
    # Ensure you are running this from the root CAT_Models directory
    maint_model = MaintenancePredictor(model_dir=r"c:\Users\yekka\Desktop\CAT_Models\models\v3_models")
    
    sample_telemetry = {
        "total_hours": 3500,
        "roll_hours": 120,
        "utilization_pct": 85,
        "roll_dtc_3d": 1,  # 1 recent fault code
        "roll_sos_3d": 0   # 0 fluid alerts
    }
    
    print("Test Prediction:", maint_model.predict(sample_telemetry))
