import os
from contextlib import asynccontextmanager

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    AnomalyResponse,
    DemandResponse,
    MaintenanceResponse,
    SiteInput,
    TelemetryInput,
    UtilizationResponse,
    ChatInput,
    ChatResponse
)

from langchain_openai import ChatOpenAI
from langchain_experimental.agents.agent_toolkits import create_pandas_dataframe_agent
import dotenv
dotenv.load_dotenv()

models = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    for name, filename in {
        "utilization": "m1_utilization.pkl",
        "anomaly": "m2_anomaly.pkl",
        "maintenance": "m3_maintenance.pkl",
        "demand": "m4_demand.pkl",
    }.items():
        try:
            models[name] = joblib.load(os.path.join(model_dir, filename))
        except Exception as error:
            print(f"Unable to load {name} model: {error}")
    yield
    models.clear()


app = FastAPI(title="CAT FleetFlow ML Service", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")],
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
    features = ["engine_hours", "idle_hours", "fuel_consumed", "utilization_pct", "age_years"]
    frame = pd.DataFrame([data.model_dump()])[features]
    prediction = model.predict(frame)[0]
    probabilities = model.predict_proba(frame)[0]
    return UtilizationResponse(
        prediction=str(prediction),
        confidence=float(max(probabilities)),
        probabilities={str(label): float(value) for label, value in zip(model.classes_, probabilities)},
    )


@app.post("/predict/anomaly", response_model=AnomalyResponse)
def predict_anomaly(data: TelemetryInput):
    if "anomaly" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")
    model = models["anomaly"]
    values = data.model_dump()
    values["fuel_per_hour"] = values.get("fuel_per_hour") or values["fuel_consumed"] / max(values["engine_hours"], 1e-5)
    frame = pd.DataFrame([values])[["fuel_per_hour", "utilization_pct", "idle_hours"]]
    return AnomalyResponse(is_anomaly=bool(model.predict(frame)[0] == -1))


@app.post("/predict/maintenance", response_model=MaintenanceResponse)
def predict_maintenance(data: TelemetryInput):
    if "maintenance" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")
    model = models["maintenance"]
    frame = pd.DataFrame([data.model_dump()])[["total_hours", "roll_hours", "utilization_pct", "roll_dtc_3d", "roll_sos_3d"]]
    prediction = model.predict(frame)[0]
    probabilities = model.predict_proba(frame)[0]
    return MaintenanceResponse(maintenance_risk_7d=bool(prediction == 1.0), confidence=float(max(probabilities)))


@app.post("/predict/demand", response_model=DemandResponse)
def predict_demand(data: SiteInput):
    if "demand" not in models:
        raise HTTPException(status_code=503, detail="Model not loaded")
    frame = pd.DataFrame([data.model_dump()])[["active_equip_count", "prev_week_demand"]]
    return DemandResponse(predicted_next_week_demand=int(round(float(models["demand"].predict(frame)[0]))))

@app.post("/chat", response_model=ChatResponse)
def data_chat(data: ChatInput):
    # Dynamically find the data directory
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "raw", "v3_cat")
    try:
        df_eq = pd.read_csv(os.path.join(data_dir, "equipment.csv"))
        df_maint = pd.read_csv(os.path.join(data_dir, "maintenance.csv"))
        df_sites = pd.read_csv(os.path.join(data_dir, "sites.csv"))
        
        # We use a fast, lightweight Pandas Agent
        llm = ChatOpenAI(temperature=0, model="gpt-4o")
        agent = create_pandas_dataframe_agent(
            llm, 
            [df_eq, df_maint, df_sites], 
            verbose=False, 
            allow_dangerous_code=True,
            agent_type="openai-tools"
        )
        
        result = agent.invoke({"input": data.query})
        return ChatResponse(answer=result["output"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
