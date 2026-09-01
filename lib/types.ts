export type AssetStatus = "available" | "checked-out" | "maintenance";
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
  engineHours: number;
  idleHours: number;
  fuelLevel: number;
  condition: Condition;
  lastActivity: string;
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
  name: string;
  initials: string;
  role: string;
};

export type Site = {
  name: string;
  code: string;
};
