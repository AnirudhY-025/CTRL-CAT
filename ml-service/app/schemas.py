from typing import Dict, Optional
from pydantic import BaseModel, Field

class TelemetryInput(BaseModel):
    engine_hours: float = Field(default=0.0)
    idle_hours: float = Field(default=0.0)
    fuel_consumed: float = Field(default=0.0)
    utilization_pct: float = Field(default=0.0)
    age_years: float = Field(default=0.0)
    total_hours: float = Field(default=0.0)
    roll_hours: float = Field(default=0.0)
    roll_dtc_3d: int = Field(default=0)
    roll_sos_3d: int = Field(default=0)
    fuel_per_hour: Optional[float] = None

class SiteInput(BaseModel):
    active_equip_count: int = Field(default=0)
    prev_week_demand: int = Field(default=0)

class UtilizationResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: Dict[str, float]

class AnomalyResponse(BaseModel):
    is_anomaly: bool

class MaintenanceResponse(BaseModel):
    maintenance_risk_7d: bool
    confidence: float

class DemandResponse(BaseModel):
    predicted_next_week_demand: int

class ChatInput(BaseModel):
    query: str

class ChatResponse(BaseModel):
    answer: str