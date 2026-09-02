export type AssetStatus = "available" | "checked-out" | "maintenance";

// ── ML / Alert types ────────────────────────────────────────────────────────

export type RiskLevel = "Low" | "Medium" | "High";

export type AssetInsights = {
  /** m1_utilization.pkl — How efficiently the machine is being used */
  utilization: {
    category: string;         // e.g. "Under-utilized" | "Normal" | "Over-utilized"
    confidence: number;       // 0–1
  } | null;
  /** m2_anomaly.pkl — Flags unusual fuel/idle behaviour */
  anomaly: {
    isAnomalous: boolean;
  } | null;
  /** m3_maintenance.pkl — Predicted failure risk within 7 days */
  maintenance: {
    riskIn7Days: boolean;
    risk: RiskLevel;          // derived from confidence
    confidence: number;       // 0–1
  } | null;
  error?: string;
};

export type DemandForecast = {
  siteName: string;
  currentCount: number;
  predictedNextWeek: number;
  delta: number;
}[];

export type AlertResponse = {
  success: boolean;
  message: string;
};

export type EmailTemplateKey =
  | "telemetry-alert"
  | "maintenance"
  | "low-fuel"
  | "rental-overdue"
  | "rental-extension"
  | "general";

export type DashboardMetrics = {
  fleetUtilizationPct: number | null;
  fleetUtilizationChangePct: number | null;
  maintenanceBacklog: number | null;
  telemetryCoveragePct: number | null;
  telemetryStaleCount: number | null;
  telemetryAsOf: string | null;
};

export type Condition = "Good" | "Monitor" | "Service due";
export type WorkflowAction = "checkout" | "checkin";

export type Asset = {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  status: AssetStatus;
  site: string;
  location: string;
  operator: string | null;
  operatorInitials: string | null;
  engineHours: number | null;
  idleHours: number | null;
  fuelLevel: number | null;
  condition: Condition;
  lastActivity: string;
  siteId?: string | null;
  operatorId?: string | null;
  rentalId?: string | null;
};

export type Activity = {
  id: string;
  action: string;
  assetId: string;
  assetName: string;
  detail: string;
  time: string;
  tone: "amber" | "blue" | "green" | "red";
};

export type Operator = {
  id: string;
  name: string;
  initials: string;
  role: string;
};

export type Site = {
  id: string;
  name: string;
  code: string;
  customerName?: string | null;
};
