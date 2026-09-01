import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .schemas import (
    TelemetryInput, SiteInput, UtilizationResponse, 
    AnomalyResponse, MaintenanceResponse, DemandResponse
)

# Global model variables
models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models on startup
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_dir = os.path.join(base_dir, "models")
    
    try:
        models["utilization"] = joblib.load(os.path.join(model_dir, "m1_utilization.pkl"))
        models["anomaly"] = joblib.load(os.path.join(model_dir, "m2_anomaly.pkl"))
        models["maintenance"] = joblib.load(os.path.join(model_dir, "m3_maintenance.pkl"))
        models["demand"] = joblib.load(os.path.join(model_dir, "m4_demand.pkl"))
        print("All models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}")
        # We don't raise here so the health endpoint can still work for debugging
        
    yield
    # Clean up on shutdown
    models.clear()

app = FastAPI(title="CAT FleetFlow ML Service", lifespan=lifespan)

# CORS Configuration
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "models_loaded": len(models) == 4}

@app.post("/predict/utilization", response_model=UtilizationResponse)
def predict_utilization(data: TelemetryInput):
    if "utilization" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    model = models["utilization"]
    features = ['engine_hours', 'idle_hours', 'fuel_consumed', 'utilization_pct', 'age_years']
    
    df = pd.DataFrame([data.model_dump()])[features]
    pred = model.predict(df)[0]
    probs = model.predict_proba(df)[0]
    
    return UtilizationResponse(
        prediction=str(pred),
        confidence=float(max(probs)),
        probabilities={str(c): float(p) for c, p in zip(model.classes_, probs)}
    )

@app.post("/predict/anomaly", response_model=AnomalyResponse)
def predict_anomaly(data: TelemetryInput):
    if "anomaly" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    model = models["anomaly"]
    features = ['fuel_per_hour', 'utilization_pct', 'idle_hours']
    
    input_dict = data.model_dump()
    if input_dict.get('fuel_per_hour') is None:
        engine_hours = max(input_dict.get('engine_hours', 1.0), 1e-5)
        input_dict['fuel_per_hour'] = input_dict.get('fuel_consumed', 0.0) / engine_hours
        
    df = pd.DataFrame([input_dict])[features]
    is_anomaly = model.predict(df)[0] == -1
    
    return AnomalyResponse(is_anomaly=bool(is_anomaly))

@app.post("/predict/maintenance", response_model=MaintenanceResponse)
def predict_maintenance(data: TelemetryInput):
    if "maintenance" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    model = models["maintenance"]
    features = ['total_hours', 'roll_hours', 'utilization_pct', 'roll_dtc_3d', 'roll_sos_3d']
    
    df = pd.DataFrame([data.model_dump()])[features]
    pred = model.predict(df)[0]
    probs = model.predict_proba(df)[0]
    
    return MaintenanceResponse(
        maintenance_risk_7d=bool(pred == 1.0),
        confidence=float(max(probs))
    )

@app.post("/predict/demand", response_model=DemandResponse)
def predict_demand(data: SiteInput):
    if "demand" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    model = models["demand"]
    features = ['active_equip_count', 'prev_week_demand']
    
    df = pd.DataFrame([data.model_dump()])[features]
    pred = model.predict(df)[0]
    
    return DemandResponse(predicted_next_week_demand=int(round(float(pred))))
