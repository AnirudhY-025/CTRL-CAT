"use client";

import {
  Activity as ActivityIcon,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  BrainCircuit,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Flame,
  Fuel,
  Gauge,
  Headphones,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  Printer,
  QrCode,
  Search,
  Send,
  Settings2,
  TrendingUp,
  UserRound,
  UsersRound,
  Wifi,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import * as React from "react";

export interface EmergencyIncident {
  id: string;
  assetId: string;
  assetName: string;
  customerName: string;
  siteName: string;
  incidentType: "sudden_damage" | "temp_surge";
  title: string;
  detail: string;
  timestamp: string;
  status: "active" | "dispatched" | "resolved";
  actionResult?: string;
}

import { Badge } from "@/components/ui/badge";
import { SitesView } from "@/components/sites-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  checkinEquipment,
  checkoutEquipment,
  fetchActivity,
  fetchDashboardMetrics,
  fetchDemand,
  fetchEquipment,
  fetchInsights,
  fetchOperators,
  fetchSites,
  triggerEmailAlert,
  triggerVoiceAlert,
} from "@/lib/api";
import type {
  Activity,
  AlertResponse,
  Asset,
  AssetInsights,
  AssetStatus,
  Condition,
  DashboardMetrics,
  DemandForecast,
  EmailTemplateKey,
  WorkflowAction,
} from "@/lib/types";
import type { Operator, Site } from "@/lib/types";
import { cn } from "@/lib/utils";
import { QrScannerDialog } from "@/components/qr-scanner-dialog";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AssetQrDialog } from "@/components/asset-qr-dialog";
import { ActivityDashboard } from "@/components/activity-dashboard";

type FilterStatus = AssetStatus | "all" | "attention";

const GLOBAL_ACTIVITY_LIMIT = 6;
const ACTIVITY_STATE_LIMIT = 20;
const ITEMS_PER_PAGE = 10;

const workflowItems: {
  label: string;
  action: WorkflowAction;
  icon: typeof ArrowUpFromLine;
}[] = [
  { label: "Check out", action: "checkout", icon: ArrowUpFromLine },
  { label: "Check in", action: "checkin", icon: ArrowDownToLine },
];

const navItems = [
  { label: "Equipment", icon: Boxes },
  { label: "Customers", icon: UsersRound },
  { label: "Sites & locations", icon: MapPin },
  { label: "Activity", icon: BarChart3 },
] as const;

type DashboardTab = (typeof navItems)[number]["label"];

type CustomerContactRequest = {
  customerName: string;
  operatorName: string;
  assetId: string;
  assetName: string;
  siteName: string;
};

type DemandSummary = {
  predictedNextWeek: number;
  netChange: number;
  topSite: string | null;
};

const statusLabels: Record<AssetStatus, string> = {
  available: "Available",
  "checked-out": "Checked out",
  maintenance: "Maintenance",
};

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusVariant(status: AssetStatus) {
  if (status === "available") return "available" as const;
  if (status === "maintenance") return "maintenance" as const;
  return "checkedOut" as const;
}

function conditionVariant(condition: Condition) {
  if (condition === "Good") return "good" as const;
  if (condition === "Monitor") return "monitor" as const;
  return "service" as const;
}

function isAssetEligible(asset: Asset, action: WorkflowAction) {
  return action === "checkout"
    ? asset.status === "available"
    : asset.status === "checked-out";
}

function eligibilityMessage(action: WorkflowAction) {
  return action === "checkout"
    ? "Only available equipment can be checked out."
    : "Only checked-out equipment can be checked in.";
}

function assetTone(category: string) {
  if (category === "Excavator") return "bg-[#fff1c2] text-[#8a5a00]";
  if (category === "Dozer") return "bg-[#ede7d8] text-[#4b463b]";
  if (category === "Wheel loader") return "bg-[#ffe3a3] text-[#8a5a00]";
  if (category === "Haul truck") return "bg-[#f8ead0] text-[#a36d2f]";
  return "bg-[#e9e9e6] text-[#4b4a45]";
}

export function RentalDashboard() {
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [activity, setActivity] = React.useState<Activity[]>([]);
  const [operators, setOperators] = React.useState<Operator[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [demand, setDemand] = React.useState<DemandForecast>([]);
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [equipmentQuery, setEquipmentQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState<DashboardTab>("Equipment");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<
    string | null
  >(null);
  const [customerContactRequest, setCustomerContactRequest] =
    React.useState<CustomerContactRequest | null>(null);
  const [action, setAction] = React.useState<WorkflowAction | null>(null);
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(
    null,
  );
  const [workflowAssetId, setWorkflowAssetId] = React.useState<string | null>(
    null,
  );
  const [selectedActivityId, setSelectedActivityId] = React.useState<
    string | null
  >(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [emergencyIncident, setEmergencyIncident] =
    React.useState<EmergencyIncident | null>(null);
  const [incidentDispatchStatus, setIncidentDispatchStatus] = React.useState<
    string | null
  >(null);
  const [hotlineOpen, setHotlineOpen] = React.useState(false);
  const [qrScannerOpen, setQrScannerOpen] = React.useState(false);
  const [addAssetOpen, setAddAssetOpen] = React.useState(false);
  const [qrDialogAsset, setQrDialogAsset] = React.useState<Asset | null>(null);

  function simulateSobhaIncident() {
    const sobhaAsset = assets.find((a) => a.id === "EQX1001") || assets[0];
    const incident: EmergencyIncident = {
      id: `INC-${Date.now().toString().slice(-4)}`,
      assetId: sobhaAsset ? sobhaAsset.id : "EQX1001",
      assetName: sobhaAsset ? sobhaAsset.name : "CAT 320 GC Excavator",
      customerName: "Sobha Constructions",
      siteName: "Riverbend Materials",
      incidentType: "temp_surge",
      title: "Sudden Engine Thermal Spike & Hydraulic Shock",
      detail:
        "Coolant temperature spiked to 112°C with simultaneous hydraulic line pressure overload on crusher pad.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "active",
    };
    setEmergencyIncident(incident);
    setIncidentDispatchStatus(null);

    // Update the asset condition locally to alert dealer
    if (sobhaAsset) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === sobhaAsset.id ? { ...a, condition: "Service due" } : a,
        ),
      );
    }

    // Real-time broadcast into activity feed
    setActivity((prev) => [
      {
        id: `act-inc-${Date.now()}`,
        action: "🚨 EMERGENCY ALERT",
        assetId: incident.assetId,
        assetName: incident.assetName,
        detail: `Sudden thermal spike & damage warning at ${incident.siteName} (Sobha Constructions)`,
        time: "Just now",
        tone: "red",
      },
      ...prev,
    ]);
  }

  async function triggerIncidentVoiceCall() {
    if (!emergencyIncident) return;
    setIncidentDispatchStatus("Dialing Sobha Operations Lead via Vapi AI…");
    const res = await triggerVoiceAlert({
      phoneNumber: "+919999999999",
      assetId: emergencyIncident.assetId,
      assetName: emergencyIncident.assetName,
      siteName: emergencyIncident.siteName,
      riskDescription: emergencyIncident.detail,
    }).catch(() => ({ success: false, message: "AI voice call failed" }));
    setIncidentDispatchStatus(
      res.success
        ? "✓ AI Voice Call Dispatched to Sobha Lead"
        : `✗ ${res.message}`,
    );
  }

  async function triggerIncidentEmail() {
    if (!emergencyIncident) return;
    setIncidentDispatchStatus("Sending emergency dealer dispatch email…");
    const contact = getCustomerContact(emergencyIncident.customerName);
    const res = await triggerEmailAlert({
      toEmail: contact.email,
      managerName: contact.name,
      customerCompany: emergencyIncident.customerName,
      assetId: emergencyIncident.assetId,
      assetName: emergencyIncident.assetName,
      siteName: emergencyIncident.siteName,
      alertType: emergencyIncident.incidentType,
      detail: emergencyIncident.detail,
    }).catch(() => ({ success: false, message: "Email dispatch failed" }));
    setIncidentDispatchStatus(
      res.success
        ? `✓ Emergency Alert Dispatched to ${contact.email}`
        : `✗ ${res.message}`,
    );
  }

  const globalActivity = activity.slice(0, GLOBAL_ACTIVITY_LIMIT);

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [
        nextAssets,
        nextActivity,
        nextOperators,
        nextSites,
        nextDemand,
        nextMetrics,
      ] = await Promise.all([
        fetchEquipment(),
        fetchActivity(ACTIVITY_STATE_LIMIT),
        fetchOperators(),
        fetchSites(),
        fetchDemand().catch(() => [] as DemandForecast),
        fetchDashboardMetrics().catch(() => null),
      ]);
      setAssets(nextAssets);
      setActivity(nextActivity);
      setOperators(nextOperators);
      setSites(nextSites);
      setDemand(nextDemand);
      setMetrics(nextMetrics);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const counts = {
    all: assets.length,
    available: assets.filter((asset) => asset.status === "available").length,
    "checked-out": assets.filter((asset) => asset.status === "checked-out")
      .length,
    maintenance: assets.filter((asset) => asset.status === "maintenance")
      .length,
    attention: assets.filter(
      (asset) => asset.condition !== "Good" || (asset.fuelLevel ?? 100) < 50,
    ).length,
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "attention"
          ? asset.condition !== "Good" || (asset.fuelLevel ?? 100) < 50
          : asset.status === statusFilter;
    const normalizedQuery = equipmentQuery.toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      [
        asset.id,
        asset.name,
        asset.site,
        asset.location,
        asset.operator ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });

  // Reset to page 1 whenever the filter or search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [equipmentQuery, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssets.length / ITEMS_PER_PAGE),
  );
  const pagedAssets = filteredAssets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);

  function openAsset(assetId: string, activityId: string | null = null) {
    setAction(null);
    setWorkflowAssetId(null);
    setSelectedAssetId(assetId);
    setSelectedActivityId(activityId);
  }

  function openAction(nextAction: WorkflowAction, assetId = "") {
    setSelectedAssetId(null);
    setSelectedActivityId(null);
    setWorkflowAssetId(assetId || null);
    setAction(nextAction);
  }

  function closeAsset() {
    setSelectedAssetId(null);
    setWorkflowAssetId(null);
    setSelectedActivityId(null);
  }

  function openCustomerFromAsset(request: CustomerContactRequest) {
    closeAsset();
    setActiveTab("Customers");
    setSelectedCustomerId(request.customerName);
    setCustomerContactRequest(request);
  }

  function handleCustomerSelection(customerName: string | null) {
    setSelectedCustomerId(customerName);
    if (!customerName) {
      setCustomerContactRequest(null);
    }
  }

  const demandSummary = React.useMemo<DemandSummary | null>(() => {
    if (demand.length === 0) return null;
    const topSite = demand.reduce((current, item) =>
      item.delta > current.delta ? item : current,
    );
    return {
      predictedNextWeek: demand.reduce(
        (total, item) => total + item.predictedNextWeek,
        0,
      ),
      netChange: demand.reduce((total, item) => total + item.delta, 0),
      topSite: topSite?.siteName ?? null,
    };
  }, [demand]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  function handleWorkflowComplete(
    updatedAsset: Asset,
    message: string,
    activityItem: Activity,
  ) {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === updatedAsset.id ? updatedAsset : asset,
      ),
    );
    setActivity((current) =>
      [activityItem, ...current].slice(0, ACTIVITY_STATE_LIMIT),
    );
    setAction(null);
    setSelectedAssetId(null);
    setWorkflowAssetId(null);
    setSelectedActivityId(null);
    showToast(message);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        Loading equipment operations…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <CircleAlert className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-3 text-lg font-black">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button className="mt-5" onClick={() => void loadDashboard()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh min-w-0 overflow-x-clip bg-background text-foreground lg:flex">
      <aside className="sticky top-0 self-start hidden h-dvh min-h-0 w-[248px] shrink-0 flex-col overflow-y-auto overscroll-contain bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(255,205,17,0.2)]">
            <Wrench className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">CTRL+CAT</p>
          </div>
        </div>

        <div className="mt-10 px-3 text-[10px] font-bold tracking-[0.08em] text-sidebar-muted">
          Workspace
        </div>
        <nav className="mt-3 space-y-1" aria-label="Equipment navigation">
          <SidebarNavigation activeTab={activeTab} onSelect={setActiveTab} />
        </nav>

        <button
          type="button"
          className="mt-auto flex items-center gap-3 border-t border-sidebar-foreground/10 px-3 pt-5 text-sm font-medium text-sidebar-muted transition-colors hover:text-sidebar-foreground"
          aria-label="Settings"
        >
          <Settings2 className="h-[17px] w-[17px]" strokeWidth={1.8} />
          <span>Settings</span>
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl bg-sidebar text-primary hover:bg-sidebar/90 hover:text-primary lg:hidden"
                aria-label="Open navigation"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <p className="truncate text-sm font-black tracking-tight sm:text-base">
                CTRL+CAT
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3 md:flex-nowrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHotlineOpen(true)}
                className="gap-1.5 border-primary/40 bg-primary/10 text-foreground hover:bg-primary/20 text-xs font-bold shadow-sm"
              >
                <Headphones className="h-3.5 w-3.5 text-[#8a5a00]" />
                <span className="hidden md:inline">
                  24/7 AI Diagnostic Hotline
                </span>
                <span className="md:hidden">AI Hotline</span>
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setQrScannerOpen(true)}
                aria-label="Scan checkout"
                className="gap-1.5 text-xs font-bold shadow-sm"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Scan Checkout</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={simulateSobhaIncident}
                className="gap-1.5 border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-bold shadow-sm transition-all hover:scale-105"
              >
                <Zap className="h-3.5 w-3.5 text-red-500 fill-red-500 animate-pulse" />
                <span className="hidden sm:inline">
                  ⚡ Simulate Incident (Sobha)
                </span>
                <span className="sm:hidden">⚡ Simulate</span>
              </Button>
            </div>
          </div>
        </header>

        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent
            id="mobile-navigation"
            className="w-[280px] max-w-[85vw] sm:w-[320px]"
          >
            <DialogHeader>
              <DialogTitle>Navigation</DialogTitle>
              <DialogDescription className="sr-only">
                Choose a dashboard area.
              </DialogDescription>
            </DialogHeader>
            <nav aria-label="Mobile equipment navigation">
              <SidebarNavigation
                activeTab={activeTab}
                onSelect={(tab) => {
                  setActiveTab(tab);
                  setMobileNavOpen(false);
                }}
              />
            </nav>
          </DialogContent>
        </Dialog>

        {/* 🚨 CRITICAL INCIDENT FLASH BANNER */}
        {emergencyIncident && (
          <div className="border-b border-red-500/40 bg-gradient-to-r from-red-950 via-red-900 to-amber-950 px-5 py-4 text-white shadow-xl sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-[0_0_24px_rgba(220,38,38,0.8)] animate-pulse">
                  <Flame className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-500/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-200 border border-red-400/40 animate-pulse">
                      🚨 CRITICAL DEALERSHIP ALERT
                    </span>
                    <span className="text-xs font-bold text-amber-300">
                      {emergencyIncident.customerName} ·{" "}
                      {emergencyIncident.siteName}
                    </span>
                    <span className="text-[11px] text-zinc-300">
                      Detected at {emergencyIncident.timestamp}
                    </span>
                  </div>
                  <h3 className="mt-1 text-sm font-black text-white sm:text-base">
                    {emergencyIncident.title} — {emergencyIncident.assetName} (
                    {emergencyIncident.assetId})
                  </h3>
                  <p className="mt-0.5 text-xs text-red-200">
                    {emergencyIncident.detail}
                  </p>
                  {incidentDispatchStatus && (
                    <p className="mt-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/60 inline-block px-2.5 py-1 rounded-md border border-emerald-500/40">
                      {incidentDispatchStatus}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-0">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition-all hover:scale-105"
                  onClick={triggerIncidentVoiceCall}
                >
                  <Phone className="h-3.5 w-3.5" />
                  AI Voice Call (Sobha Lead)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-400/60 bg-amber-950/40 text-amber-200 hover:bg-amber-900/60 font-semibold"
                  onClick={triggerIncidentEmail}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email Emergency Notice
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-zinc-300 hover:text-white"
                  onClick={() => setSelectedAssetId(emergencyIncident.assetId)}
                >
                  Inspect Asset
                </Button>
                <button
                  type="button"
                  onClick={() => setEmergencyIncident(null)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Dismiss incident banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="mx-auto w-full min-w-0 max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          {activeTab === "Customers" ? (
            <CustomersView
              sites={sites}
              assets={assets}
              selectedCustomer={selectedCustomerId}
              contactRequest={customerContactRequest}
              onSelectCustomer={handleCustomerSelection}
              onDismissContactRequest={() => setCustomerContactRequest(null)}
            />
          ) : activeTab === "Sites & locations" ? (
            <SitesView sites={sites} assets={assets} />
          ) : activeTab === "Activity" ? (
            <ActivityDashboard assets={assets} demand={demand} />
          ) : (
            <>
              <div className="mb-7">
                <div>
                  <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                    Equipment overview
                  </h2>
                </div>
              </div>
              <OverviewStats metrics={metrics} demand={demandSummary} />
              <StatusFilterStrip
                counts={counts}
                value={statusFilter}
                onChange={setStatusFilter}
              />

              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <Card className="min-w-0 overflow-hidden">
                  <CardHeader className="gap-4 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        Equipment status
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {filteredAssets.length} matching assets
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-full sm:w-[240px]">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={equipmentQuery}
                          onChange={(event) => setEquipmentQuery(event.target.value)}
                          placeholder="Search ID, machine..."
                          className="h-10 pl-11"
                          aria-label="Search equipment table"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setAddAssetOpen(true)}
                        className="h-10 gap-1.5 font-bold shadow-sm shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Equipment</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left">
                      <thead>
                        <tr className="border-b border-border/70 bg-muted/50 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
                          <th className="px-5 py-3.5 font-bold">Equipment</th>
                          <th className="px-3 py-3.5 font-bold">Status</th>
                          <th className="px-3 py-3.5 font-bold">
                            Site / location
                          </th>
                          <th className="px-3 py-3.5 font-bold text-right">QR Tag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedAssets.map((asset) => (
                          <AssetRow
                            key={asset.id}
                            asset={asset}
                            onOpen={openAsset}
                            onOpenQr={(a) => setQrDialogAsset(a)}
                          />
                        ))}
                      </tbody>
                    </table>
                    {filteredAssets.length === 0 && (
                      <div className="px-6 py-14 text-center text-sm text-muted-foreground">
                        No equipment matches your current filters.
                      </div>
                    )}
                  </div>
                  {/* Pagination footer */}
                  <div className="flex items-center justify-between border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
                    <span>
                      Showing{" "}
                      <span className="font-bold text-foreground">
                        {filteredAssets.length === 0
                          ? 0
                          : (currentPage - 1) * ITEMS_PER_PAGE + 1}
                        –
                        {Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          filteredAssets.length,
                        )}
                      </span>{" "}
                      of {filteredAssets.length} assets
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[52px] text-center font-bold text-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>

                {/* Right column — stacked cards */}
                <div className="flex min-w-0 flex-col gap-6">
                  <Card className="h-fit">
                    <CardHeader>
                      <div>
                        <CardTitle className="text-base">
                          Recent activity
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {globalActivity.map((item, index) => (
                        <ActivityItem
                          key={item.id}
                          item={item}
                          isLast={index === globalActivity.length - 1}
                          onOpen={() => openAsset(item.assetId, item.id)}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  {/* AI Demand Forecast card */}
                  <Card className="h-fit">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff1c2] text-[#8a5a00]">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            AI Demand Forecast
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {demand.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {loading
                            ? "Loading…"
                            : "ML service offline — start FastAPI to enable forecasts."}
                        </p>
                      ) : (
                        demand.slice(0, 5).map((item) => (
                          <div
                            key={item.siteName}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-foreground">
                                {item.siteName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Current: {item.currentCount} units
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-foreground">
                                {item.predictedNextWeek}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] font-bold",
                                  item.delta > 0
                                    ? "text-amber-600"
                                    : item.delta < 0
                                      ? "text-emerald-600"
                                      : "text-muted-foreground",
                                )}
                              >
                                {item.delta > 0 ? `+${item.delta}` : item.delta}{" "}
                                next wk
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
                {/* end right column */}
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-sidebar px-5 py-4 text-sidebar-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <ActivityIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Movement actions</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {workflowItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.action}
                        type="button"
                        onClick={() => openAction(item.action)}
                        variant={
                          item.action === "checkout" ? "default" : "secondary"
                        }
                        size="sm"
                        className="gap-2"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <AssetDetailDrawer
        asset={selectedAsset}
        sites={sites}
        activities={activity}
        selectedActivityId={selectedActivityId}
        onClose={closeAsset}
        onAction={openAction}
        onOpenCustomer={openCustomerFromAsset}
        onOpenQr={(a) => setQrDialogAsset(a)}
      />
      <AssetQrDialog
        open={Boolean(qrDialogAsset)}
        onOpenChange={(open) => !open && setQrDialogAsset(null)}
        assetId={qrDialogAsset?.id ?? ""}
        assetName={qrDialogAsset?.name ?? ""}
        serialNumber={qrDialogAsset?.serialNumber}
      />
      <AddAssetDialog
        open={addAssetOpen}
        onOpenChange={setAddAssetOpen}
        onAssetAdded={(newAsset) => {
          setAssets((prev) => [newAsset, ...prev]);
          showToast(`✓ Added ${newAsset.id} (${newAsset.name}) to inventory`);
        }}
      />
      <QrScannerDialog
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={(id) => {
          // Find if asset exists
          const found = assets.find((a) => a.id === id);
          if (found) {
            setWorkflowAssetId(id);
            setAction("checkout");
          } else {
            showToast(`Asset ${id} not found in inventory.`);
          }
        }}
      />
      <DiagnosticHotlineDialog
        open={hotlineOpen}
        onClose={() => setHotlineOpen(false)}
        assets={assets}
        sites={sites}
      />
      <WorkflowDrawer
        action={action}
        assets={assets}
        operators={operators}
        sites={sites}
        selectedAssetId={workflowAssetId ?? ""}
        onSelectedAssetChange={setWorkflowAssetId}
        onClose={() => {
          setAction(null);
          setWorkflowAssetId(null);
        }}
        onComplete={handleWorkflowComplete}
      />
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_14px_36px_rgba(35,34,52,0.14)]"
        >
          <Check className="h-4 w-4 shrink-0" />
          {toast}
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-emerald-500/70 hover:text-emerald-700"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: DashboardTab;
  onSelect: (tab: DashboardTab) => void;
}) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.label;
        return (
          <button
            key={item.label}
            onClick={() => onSelect(item.label)}
            type="button"
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(255,205,17,0.15)]"
                : "text-sidebar-muted hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
            <span>{item.label}</span>
            {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
        );
      })}
    </>
  );
}

function OverviewStats({
  metrics,
  demand,
}: {
  metrics: DashboardMetrics | null;
  demand: DemandSummary | null;
}) {
  const utilizationValue =
    metrics?.fleetUtilizationPct === null ||
    metrics?.fleetUtilizationPct === undefined
      ? "—"
      : `${Math.round(metrics.fleetUtilizationPct)}%`;
  const utilizationTrend =
    metrics?.fleetUtilizationChangePct === null ||
    metrics?.fleetUtilizationChangePct === undefined
      ? "No comparison data"
      : `${metrics.fleetUtilizationChangePct >= 0 ? "+" : ""}${metrics.fleetUtilizationChangePct.toFixed(1)} pts vs prior 7d`;
  const demandTrend = demand
    ? `${demand.netChange >= 0 ? "+" : ""}${demand.netChange} units net change`
    : "Forecast unavailable";
  const telemetryDetail =
    metrics?.telemetryStaleCount === null ||
    metrics?.telemetryStaleCount === undefined
      ? "No telemetry data"
      : `${metrics.telemetryStaleCount} stale assets`;

  const stats = [
    {
      label: "Fleet utilization",
      value: utilizationValue,
      detail: "7-day average",
      trend: utilizationTrend,
      icon: Gauge,
      tone: "bg-[#fff1c2] text-[#8a5a00]",
    },
    {
      label: "Demand outlook",
      value: demand ? demand.predictedNextWeek : "—",
      detail: demand?.topSite ? `Next week · ${demand.topSite}` : "Next week forecast",
      trend: demandTrend,
      icon: TrendingUp,
      tone: "bg-[#e9f2dc] text-[#4e7a2a]",
    },
    {
      label: "Maintenance backlog",
      value:
        metrics?.maintenanceBacklog === null ||
        metrics?.maintenanceBacklog === undefined
          ? "—"
          : metrics.maintenanceBacklog,
      detail: "Service due or flagged",
      trend: "Review before next dispatch",
      icon: Wrench,
      tone: "bg-[#f6e1d2] text-[#a85e3d]",
    },
    {
      label: "Telemetry coverage",
      value:
        metrics?.telemetryCoveragePct === null ||
        metrics?.telemetryCoveragePct === undefined
          ? "—"
          : `${Math.round(metrics.telemetryCoveragePct)}%`,
      detail: telemetryDetail,
      trend: metrics?.telemetryAsOf
        ? `Reporting as of ${metrics.telemetryAsOf}`
        : "Reporting status unavailable",
      icon: Wifi,
      tone: "bg-[#e5eef5] text-[#32627a]",
    },
  ];
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_8px_22px_rgba(35,34,52,0.03)]"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                stat.tone,
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black tracking-tight">{stat.value}</p>
              <p className="truncate text-xs font-bold text-foreground">
                {stat.label}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {stat.detail}
              </p>
              <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground/80">
                {stat.trend}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusFilterStrip({
  counts,
  value,
  onChange,
}: {
  counts: Record<FilterStatus, number>;
  value: FilterStatus;
  onChange: (value: FilterStatus) => void;
}) {
  const filters: { value: FilterStatus; label: string; color: string }[] = [
    { value: "all", label: "All equipment", color: "bg-foreground" },
    { value: "available", label: "Available", color: "bg-emerald-500" },
    { value: "checked-out", label: "Checked out", color: "bg-amber-500" },
    { value: "maintenance", label: "Maintenance", color: "bg-red-500" },
    { value: "attention", label: "Needs attention", color: "bg-[#8a5a00]" },
  ];
  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-1 rounded-2xl border border-border/70 bg-card p-1.5 shadow-[0_8px_22px_rgba(35,34,52,0.03)]"
      role="group"
      aria-label="Filter equipment status"
    >
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          aria-pressed={value === filter.value}
          onClick={() => onChange(filter.value)}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors",
            value === filter.value
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", filter.color)} />
          {filter.label}
          <span
            className={cn(
              "rounded-full bg-muted px-1.5 py-0.5 text-[10px]",
              value === filter.value
                ? "text-[#8a5a00]"
                : "text-muted-foreground",
            )}
          >
            {counts[filter.value]}
          </span>
        </button>
      ))}
    </div>
  );
}

function AssetRow({
  asset,
  onOpen,
  onOpenQr,
}: {
  asset: Asset;
  onOpen: (assetId: string) => void;
  onOpenQr?: (asset: Asset) => void;
}) {
  return (
    <tr className="group border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40">
      <td className="px-5 py-4">
        <button
          type="button"
          onClick={() => onOpen(asset.id)}
          className="flex max-w-full items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black",
              assetTone(asset.category),
            )}
          >
            {asset.category.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground group-hover:text-[#8a5a00]">
              {asset.name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {asset.id} · {asset.serialNumber}
            </p>
          </div>
        </button>
      </td>
      <td className="px-3 py-4">
        <Badge variant={statusVariant(asset.status)}>
          {statusLabels[asset.status]}
        </Badge>
      </td>
      <td className="px-3 py-4">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="max-w-[180px] truncate text-xs font-semibold text-foreground">
              {asset.site}
            </p>
            <p className="mt-0.5 max-w-[180px] truncate text-[11px] text-muted-foreground">
              {asset.location}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 text-right">
        {onOpenQr && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenQr(asset);
            }}
            className="h-8 gap-1.5 px-2.5 text-xs font-bold border-border/80 hover:bg-primary/10 hover:border-primary/50"
            title={`View/Print QR tag for ${asset.id}`}
          >
            <QrCode className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">QR Tag</span>
          </Button>
        )}
      </td>
    </tr>
  );
}

function ActivityItem({
  item,
  isLast,
  onOpen,
  highlighted = false,
}: {
  item: Activity;
  isLast: boolean;
  onOpen?: () => void;
  highlighted?: boolean;
}) {
  const tones = {
    amber: "bg-amber-400",
    blue: "bg-[#d5a900]",
    green: "bg-emerald-500",
    red: "bg-red-400",
  };
  const content = (
    <>
      <div className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
        <span className={cn("h-2 w-2 rounded-full", tones[item.tone])} />
        {!isLast && <span className="absolute top-3 h-11 w-px bg-border" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-3">
          <p className="min-w-0 flex-1 text-xs font-bold leading-snug text-foreground">
            {item.action}
          </p>
          <span className="min-w-0 flex-1 break-words text-right text-[10px] leading-snug text-muted-foreground">
            {formatActivityTime(item.time)}
          </span>
        </div>
        <p className="mt-1 min-w-0 truncate text-xs text-muted-foreground">
          {item.assetId} · {item.detail}
        </p>
      </div>
    </>
  );
  const className = cn(
    "flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors",
    onOpen &&
      "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    highlighted && "bg-accent ring-1 ring-primary/40",
  );
  return onOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className={className}
      aria-label={`Open ${item.action} for ${item.assetName}`}
    >
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}

const CUSTOMER_CONTACT_MAP: Record<string, { email: string; name: string }> = {
  "Prestige Group": {
    email: "yekkalurianirudh@gmail.com",
    name: "Prestige Site Manager",
  },
  "Sobha Constructions": {
    email: "pranshudev757@gmail.com",
    name: "Sobha Operations Lead",
  },
  "L&T": { email: "machinery@larsentoubro.com", name: "L&T Fleet Supervisor" },
  "Godrej Properties": {
    email: "ops@godrejproperties.com",
    name: "Godrej Site Admin",
  },
};

function getCustomerContact(customerName?: string | null) {
  if (!customerName) return { email: "manager@site.com", name: "Site Manager" };
  const found = CUSTOMER_CONTACT_MAP[customerName];
  if (found) return found;
  const sanitized = customerName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    email: `${sanitized}@contractor.com`,
    name: `${customerName} Operations`,
  };
}

function AssetDetailDrawer({
  asset,
  sites,
  activities,
  selectedActivityId,
  onClose,
  onAction,
  onOpenCustomer,
  onOpenQr,
}: {
  asset?: Asset;
  sites: Site[];
  activities: Activity[];
  selectedActivityId: string | null;
  onClose: () => void;
  onAction: (action: WorkflowAction, assetId?: string) => void;
  onOpenCustomer: (request: CustomerContactRequest) => void;
  onOpenQr?: (asset: Asset) => void;
}) {
  const [insights, setInsights] = React.useState<AssetInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);
  const [alertStatus, setAlertStatus] = React.useState<string | null>(null);
  const [composeOpen, setComposeOpen] = React.useState(false);

  const siteObj = asset
    ? sites.find((s) => s.id === asset.siteId) ??
      sites.find((s) => s.name === asset.site || s.code === asset.site)
    : null;
  const customerName = siteObj?.customerName || asset?.site || "Customer";
  const customerContact = getCustomerContact(customerName);
  const assetId = asset?.id;

  function openCustomer() {
    if (!asset?.operator) return;
    onOpenCustomer({
      customerName,
      operatorName: asset.operator,
      assetId: asset.id,
      assetName: asset.name,
      siteName: asset.site,
    });
  }

  // Fetch AI insights whenever the selected asset changes
  React.useEffect(() => {
    if (!assetId) {
      setInsights(null);
      return;
    }
    setInsightsLoading(true);
    setInsights(null);
    setAlertStatus(null);
    fetchInsights(assetId)
      .then(setInsights)
      .catch(() =>
        setInsights({
          utilization: null,
          anomaly: null,
          maintenance: null,
          error: "ML service offline",
        }),
      )
      .finally(() => setInsightsLoading(false));
  }, [assetId]);

  async function handleVoiceAlert() {
    if (!asset) return;
    setAlertStatus("Initiating call…");
    const result: AlertResponse = await triggerVoiceAlert({
      phoneNumber: "+919999999999", // replace with real manager phone from site data
      assetId: asset.id,
      assetName: asset.name,
      siteName: asset.site,
      riskDescription: `High probability of mechanical failure within the next 7 days detected by AI analysis with ${Math.round((insights?.maintenance?.confidence ?? 0) * 100)}% confidence`,
    }).catch(() => ({ success: false, message: "Call failed" }));
    setAlertStatus(
      result.success ? "✓ AI call initiated" : `✗ ${result.message}`,
    );
  }

  async function handleEmailAlert() {
    if (!asset) return;
    setAlertStatus(`Sending alert to ${customerContact.email}…`);
    const result: AlertResponse = await triggerEmailAlert({
      toEmail: customerContact.email,
      managerName: customerContact.name,
      assetId: asset.id,
      assetName: asset.name,
      siteName: asset.site,
      alertType: "anomaly",
      detail: `Anomalous fuel/idle usage pattern detected in the last 3 days of telemetry`,
    }).catch(() => ({ success: false, message: "Email failed" }));
    setAlertStatus(
      result.success
        ? `✓ Alert sent to ${customerContact.email}`
        : `✗ ${result.message}`,
    );
  }

  async function handleRentalExtensionCall() {
    if (!asset) return;
    setAlertStatus(`Dialing ${customerName} for Rental Contract Extension…`);
    const res = await triggerVoiceAlert({
      phoneNumber: "+919999999999",
      assetId: asset.id,
      assetName: asset.name,
      siteName: asset.site,
      customerName: customerName,
      scenario: "rental_extension",
    }).catch(() => ({ success: false, message: "Extension call failed" }));
    setAlertStatus(
      res.success
        ? `✓ Extension call dispatched to ${customerName}`
        : `✗ ${res.message}`,
    );
  }

  const localActivities = asset
    ? activities.filter((item) => item.assetId === asset.id)
    : [];

  const nextAction =
    asset?.status === "available"
      ? "checkout"
      : asset?.status === "checked-out"
        ? "checkin"
        : null;

  return (
    <Dialog open={Boolean(asset)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="shrink-0 gap-3 py-5">
          {asset && (
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black",
                  assetTone(asset.category),
                )}
              >
                {asset.category.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl tracking-tight">
                    {asset.name}
                  </DialogTitle>
                  <Badge variant={statusVariant(asset.status)}>
                    {statusLabels[asset.status]}
                  </Badge>
                </div>
                <DialogDescription className="mt-1">
                  {asset.category} · {asset.id} · {asset.serialNumber}
                </DialogDescription>
              </div>
            </div>
          )}
        </DialogHeader>
        {asset && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Clock3 className="h-4 w-4 text-[#8a5a00]" />
                  Last activity
                  <span className="font-bold text-foreground">
                    {asset.lastActivity}
                  </span>
                </div>
                <Badge variant={conditionVariant(asset.condition)}>
                  {asset.condition}
                </Badge>
              </div>

              <section className="space-y-3">
                <SectionLabel>Assignment & location</SectionLabel>
                <dl className="divide-y divide-border/70 rounded-2xl border border-border/70 px-4">
                  <DetailRow label="Operator">
                    {asset.operator ? (
                      <button
                        type="button"
                        onClick={openCustomer}
                        className="group inline-flex max-w-full items-center gap-1.5 text-right text-sm font-bold text-foreground transition-colors hover:text-[#8a5a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title={`Open ${customerName} in Customers`}
                      >
                        <UserRound className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#8a5a00]" />
                        <span className="truncate">{asset.operator}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-[#8a5a00]" />
                      </button>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </DetailRow>
                  <DetailRow label="Customer">
                    <span className="text-sm font-semibold text-foreground">
                      {customerName}
                    </span>
                  </DetailRow>
                  <DetailRow label="Site">
                    <span className="text-sm font-semibold text-foreground">
                      {asset.site}
                    </span>
                  </DetailRow>
                  <DetailRow label="Current location">
                    <span className="text-right text-sm font-semibold text-foreground">
                      {asset.location}
                    </span>
                  </DetailRow>
                </dl>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionLabel>Machine telemetry</SectionLabel>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8a5a00]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d5a900]" />
                    Latest database record
                  </span>
                </div>
                <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/40 px-4 py-4 sm:grid-cols-3">
                  <TelemetryCell
                    icon={<Gauge className="h-4 w-4" />}
                    label="Engine hours"
                    value={
                      asset.engineHours === null
                        ? "—"
                        : `${asset.engineHours.toLocaleString()} h`
                    }
                  />
                  <TelemetryCell
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Idle hours"
                    value={
                      asset.idleHours === null
                        ? "—"
                        : `${asset.idleHours.toLocaleString()} h`
                    }
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Fuel className="h-4 w-4 text-[#8a5a00]" />
                      <span className="text-[11px] font-bold">Fuel level</span>
                    </div>
                    <p className="mt-1 text-lg font-black text-foreground">
                      {asset.fuelLevel === null ? "—" : `${asset.fuelLevel}%`}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          (asset.fuelLevel ?? 100) < 25
                            ? "bg-red-500"
                            : (asset.fuelLevel ?? 100) < 50
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                        )}
                        style={{ width: `${Math.max(0, asset.fuelLevel ?? 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-3.5 w-3.5 text-[#8a5a00]" />
                  <SectionLabel>AI Insights</SectionLabel>
                  {insightsLoading && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Analysing…
                    </span>
                  )}
                </div>

                {insights?.error ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                    {insights.error}
                  </div>
                ) : insightsLoading ? (
                  <div className="h-24 animate-pulse rounded-2xl bg-muted" />
                ) : insights ? (
                  <div className="divide-y divide-border/70 rounded-2xl border border-border/70 px-4">
                    {insights.utilization && (
                      <InsightRow
                        label="Utilization"
                        value={insights.utilization.category}
                        tone={
                          insights.utilization.category === "Over-utilized"
                            ? "danger"
                            : insights.utilization.category === "Under-utilized"
                              ? "warning"
                              : "success"
                        }
                      />
                    )}
                    {insights.anomaly && (
                      <InsightRow
                        label="Fuel / idle pattern"
                        value={
                          insights.anomaly.isAnomalous ? "Anomalous" : "Normal"
                        }
                        tone={insights.anomaly.isAnomalous ? "warning" : "success"}
                      />
                    )}
                    {insights.maintenance && (
                      <InsightRow
                        label="7-day failure risk"
                        value={`${insights.maintenance.risk} · ${Math.round(insights.maintenance.confidence * 100)}%`}
                        tone={
                          insights.maintenance.risk === "High"
                            ? "danger"
                            : insights.maintenance.risk === "Medium"
                              ? "warning"
                              : "success"
                        }
                      />
                    )}

                    <div className="flex flex-wrap gap-2 py-3">
                      {insights.anomaly?.isAnomalous && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={handleEmailAlert}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Send alert
                        </Button>
                      )}
                      {insights.maintenance?.risk === "High" && (
                        <Button
                          type="button"
                          size="sm"
                          className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
                          onClick={handleVoiceAlert}
                        >
                          <Phone className="h-3.5 w-3.5" />
                          AI voice call
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setComposeOpen(true)}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Compose email
                      </Button>
                      {asset?.status === "checked-out" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-primary/50 bg-primary/5 text-foreground hover:bg-primary/15 text-xs font-bold"
                          onClick={handleRentalExtensionCall}
                        >
                          <Phone className="h-3.5 w-3.5 text-[#8a5a00]" />
                          Rental extension call
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
                {alertStatus && (
                  <p className="text-xs font-semibold text-muted-foreground">
                    {alertStatus}
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionLabel>Recent activity</SectionLabel>
                  <span className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
                    {localActivities.length} events
                  </span>
                </div>
                {localActivities.length > 0 ? (
                  <div className="space-y-0">
                    {localActivities.slice(0, 5).map((item, index) => (
                      <div
                        key={item.id}
                        className="relative flex gap-3 pb-4 last:pb-0"
                      >
                        <div className="relative flex w-3 shrink-0 justify-center">
                          <span
                            className={cn(
                              "mt-1.5 h-2 w-2 rounded-full",
                              item.id === selectedActivityId
                                ? "bg-primary ring-4 ring-primary/20"
                                : "bg-muted-foreground/50",
                            )}
                          />
                          {index < Math.min(localActivities.length, 5) - 1 && (
                            <span className="absolute left-1/2 top-4 h-full w-px -translate-x-1/2 bg-border" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-xs font-bold text-foreground">
                              {item.action}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {formatActivityTime(item.time)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    No recent activity for this asset.
                  </div>
                )}
              </section>
            </div>
            <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-card px-6 py-4">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
                {onOpenQr && asset && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenQr(asset)}
                    className="gap-2 font-bold border-primary/50 text-foreground hover:bg-primary/10"
                  >
                    <QrCode className="h-4 w-4 text-primary" />
                    Print QR Tag
                  </Button>
                )}
              </div>
              {nextAction && (
                <Button
                  type="button"
                  onClick={() => onAction(nextAction, asset.id)}
                  className="gap-2"
                >
                  {nextAction === "checkout" ? (
                    <ArrowUpFromLine className="h-4 w-4" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4" />
                  )}
                  {nextAction === "checkout" ? "Check out" : "Check in"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <ComposeEmailDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        recipientEmail={customerContact.email}
        recipientName={customerContact.name}
        companyName={customerName}
        assetId={asset?.id}
        assetName={asset?.name}
        siteName={asset?.site}
        defaultTemplate="general"
        onSuccess={(msg) => setAlertStatus(`✓ ${msg}`)}
      />
    </Dialog>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
      {children}
    </h4>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs font-semibold text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function TelemetryCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="truncate text-[11px] font-bold">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-foreground">{value}</p>
    </div>
  );
}

function InsightRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "danger" | "warning" | "success";
}) {
  const toneClasses = {
    danger: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-2">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[10px] font-black",
          toneClasses[tone],
        )}
      >
        {value}
      </span>
    </div>
  );
}

function WorkflowDrawer({
  action,
  assets,
  operators,
  sites,
  selectedAssetId,
  onSelectedAssetChange,
  onClose,
  onComplete,
}: {
  action: WorkflowAction | null;
  assets: Asset[];
  operators: Operator[];
  sites: Site[];
  selectedAssetId: string;
  onSelectedAssetChange: (value: string) => void;
  onClose: () => void;
  onComplete: (asset: Asset, message: string, activity: Activity) => void;
}) {
  const [form, setForm] = React.useState({
    operator: operators[0]?.name ?? "",
    site: sites[0]?.name ?? "",
    location: "Zone 2 · Main workface",
    condition: "Good" as Condition,
    notes: "",
    returnTime: "",
  });
  const [lookup, setLookup] = React.useState("");
  const [error, setError] = React.useState("");
  const [newOperatorMode, setNewOperatorMode] = React.useState(false);
  const [newOperatorName, setNewOperatorName] = React.useState("");
  const [newOperatorPhone, setNewOperatorPhone] = React.useState("");

  React.useEffect(() => {
    setError("");
    setNewOperatorMode(false);
    setNewOperatorName("");
    setNewOperatorPhone("");
    if (selectedAssetId) {
      setLookup(selectedAssetId);
      const selected = assets.find((asset) => asset.id === selectedAssetId);
      if (selected)
        setForm((current) => ({
          ...current,
          operator: selected.operator ?? operators[0]?.name ?? "",
          site: selected.site,
          location: selected.location,
          condition: selected.condition,
        }));
    } else {
      setLookup("");
      setForm((current) => ({
        ...current,
        operator: operators[0]?.name ?? "",
        site: sites[0]?.name ?? "",
        location: "Zone 2 · Main workface",
        condition: "Good",
      }));
    }
  }, [action, selectedAssetId, assets, operators, sites]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
  const selected =
    action && selectedAsset && isAssetEligible(selectedAsset, action)
      ? selectedAsset
      : undefined;
  const eligibleAssets = action
    ? assets.filter((asset) => isAssetEligible(asset, action))
    : [];
  const title =
    action === "checkout" ? "Check out equipment" : "Check in equipment";
  const description =
    action === "checkout"
      ? "Select an available asset and capture its dispatch assignment."
      : "Close the movement with return time and final condition.";

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectAsset(assetId: string) {
    onSelectedAssetChange(assetId);
    setError("");
  }

  function findAsset() {
    if (!action) return;
    const value = lookup.trim().toUpperCase();
    const match = assets.find(
      (asset) =>
        asset.id === value || asset.serialNumber.toUpperCase() === value,
    );
    if (!match) {
      setError("No asset found. Try CAT-320-014 or scan a registered tag.");
      return;
    }
    if (!isAssetEligible(match, action)) {
      setError(eligibilityMessage(action));
      return;
    }
    selectAsset(match.id);
    setLookup("");
  }

  function simulateScan() {
    const match = eligibleAssets[0];
    if (match) selectAsset(match.id);
    else
      setError(
        `No eligible equipment is available for ${title.toLowerCase()}.`,
      );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!action || !selected) {
      setError(
        action
          ? eligibilityMessage(action)
          : "Select an asset before continuing.",
      );
      return;
    }
    const effectiveOperatorName = newOperatorMode ? newOperatorName.trim() : form.operator;
    if (action === "checkout" && (!effectiveOperatorName || !form.site || !form.location)) {
      setError(newOperatorMode ? "Operator name, site, and location are required." : "Operator, site, and location are required.");
      return;
    }
    try {
      const result =
        action === "checkout"
          ? await checkoutEquipment({
              equipmentId: selected.id,
              operatorId: newOperatorMode
                ? null
                : operators.find((item) => item.name === form.operator)?.id ??
                  null,
              siteId: sites.find((item) => item.name === form.site)?.id ?? "",
              location: form.location,
            })
          : await checkinEquipment({
              equipmentId: selected.id,
              returnTime: form.returnTime || new Date().toISOString(),
              condition: form.condition,
              notes: form.notes,
            });
      onComplete(result.asset, result.message, result.activity);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save movement",
      );
    }
  }

  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-[#8a5a00]">
            {action === "checkout" ? (
              <ArrowUpFromLine className="h-4 w-4" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {action && (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <section>
                <FieldLabel>Asset lookup</FieldLabel>
                <div className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={lookup}
                      onChange={(event) => setLookup(event.target.value)}
                      onKeyDown={(event) =>
                        event.key === "Enter" &&
                        (event.preventDefault(), findAsset())
                      }
                      placeholder="Enter asset ID or serial number"
                      className="pl-11"
                      aria-label="Asset ID or serial number"
                    />
                    <button
                      type="button"
                      onClick={simulateScan}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-accent p-1.5 text-[#8a5a00] hover:bg-primary"
                      aria-label="Simulate QR or RFID scan"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>
                  </div>
                  <Button type="button" variant="outline" onClick={findAsset}>
                    Find
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Eligible for this action: {eligibleAssets.length}
                </p>
                {error && (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    {error}
                  </p>
                )}
                {selected && (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/40 bg-accent/40 p-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black",
                        assetTone(selected.category),
                      )}
                    >
                      {selected.category.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {selected.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {selected.id} · Current status:{" "}
                        <span className="font-bold text-foreground">
                          {statusLabels[selected.status]}
                        </span>
                      </p>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-emerald-600" />
                  </div>
                )}
              </section>
              {action === "checkout" && (
                <section className="space-y-4">
                  <Field
                    label="Site"
                    value={form.site}
                    onChange={(value) => updateForm("site", value)}
                    options={sites.map((site) => site.name)}
                  />

                  {/* ─── Operator section with toggle ─── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground">Operator</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewOperatorMode((v) => !v);
                          setNewOperatorName("");
                          setNewOperatorPhone("");
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        {newOperatorMode ? "← Use existing operator" : "+ New operator"}
                      </button>
                    </div>

                    {newOperatorMode ? (
                      <div className="space-y-2 rounded-xl border border-primary/30 bg-accent/30 p-3">
                        <p className="text-[11px] font-bold text-[#8a5a00] mb-2">New Operator Details</p>
                        <input
                          type="text"
                          placeholder="Full name *"
                          value={newOperatorName}
                          onChange={(e) => setNewOperatorName(e.target.value)}
                          className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30"
                        />
                        <input
                          type="tel"
                          placeholder="Phone number (optional)"
                          value={newOperatorPhone}
                          onChange={(e) => setNewOperatorPhone(e.target.value)}
                          className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          This operator will be logged against the checkout record.
                        </p>
                      </div>
                    ) : (
                      <Field
                        label=""
                        value={form.operator}
                        onChange={(value) => updateForm("operator", value)}
                        options={operators.map((operator) => operator.name)}
                      />
                    )}
                  </div>

                  <label className="block">
                    <FieldLabel>Location</FieldLabel>
                    <div className="relative mt-2">
                      <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={form.location}
                        onChange={(event) =>
                          updateForm("location", event.target.value)
                        }
                        className="pl-11"
                        placeholder="e.g. Zone 2 · Main workface"
                      />
                    </div>
                  </label>
                </section>
              )}
              {action === "checkin" && (
                <section className="space-y-4">
                  <label>
                    <FieldLabel>Return time</FieldLabel>
                    <Input
                      type="datetime-local"
                      value={form.returnTime}
                      onChange={(event) =>
                        updateForm("returnTime", event.target.value)
                      }
                      className="mt-2"
                    />
                  </label>
                  <Field
                    label="Final condition"
                    value={form.condition}
                    onChange={(value) => updateForm("condition", value)}
                    options={["Good", "Monitor", "Service due"]}
                  />
                  <label>
                    <FieldLabel>Return notes</FieldLabel>
                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        updateForm("notes", event.target.value)
                      }
                      className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30"
                      placeholder="Document damage, fuel, or service needs..."
                    />
                  </label>
                </section>
              )}
              {action === "checkout" && (
                <div className="rounded-2xl border border-primary/30 bg-accent/40 p-4">
                  <div className="flex gap-3">
                    <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-[#8a5a00]" />
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        Scan-ready lookup
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Use the tag button to simulate a QR/RFID read, or enter
                        a registered asset ID.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/40 px-6 py-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!selected} className="gap-2">
                <Check className="h-4 w-4" />
                {action === "checkout"
                  ? "Confirm checkout"
                  : "Complete check-in"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold text-foreground">{children}</span>;
}

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative mt-2">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-full border border-input bg-card px-4 pr-10 text-sm text-foreground outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  );
}

function CustomersView({
  sites,
  assets,
  selectedCustomer,
  onSelectCustomer,
  contactRequest,
  onDismissContactRequest,
}: {
  sites: Site[];
  assets: Asset[];
  selectedCustomer: string | null;
  onSelectCustomer: (name: string | null) => void;
  contactRequest: CustomerContactRequest | null;
  onDismissContactRequest: () => void;
}) {
  const [query, setQuery] = React.useState("");
  const normalizedQuery = query.trim().toLowerCase();

  // Group sites by customer
  const customersMap = new Map<
    string,
    { name: string; sites: Site[]; activeCount: number }
  >();
  for (const site of sites) {
    const custName = site.customerName || site.name;
    if (!customersMap.has(custName)) {
      customersMap.set(custName, { name: custName, sites: [], activeCount: 0 });
    }
    const data = customersMap.get(custName)!;
    data.sites.push(site);
  }

  // Map assets to customers based on their site
  const siteNameToCustomer = new Map<string, string>();
  const siteIdToCustomer = new Map<string, string>();
  for (const site of sites) {
    const customerName = site.customerName || site.name;
    siteNameToCustomer.set(site.name, customerName);
    siteIdToCustomer.set(site.id, customerName);
  }

  function customerForAsset(asset: Asset) {
    return (
      (asset.siteId ? siteIdToCustomer.get(asset.siteId) : undefined) ??
      siteNameToCustomer.get(asset.site)
    );
  }

  const allCustomers = Array.from(customersMap.values()).map((c) => {
    // Recalculate active count based on actual assets currently checked out at their sites
    const activeAssets = assets.filter(
      (a) =>
        a.status === "checked-out" && customerForAsset(a) === c.name,
    );
    return { ...c, activeCount: activeAssets.length };
  });

  const filteredCustomers = allCustomers.filter(
    (c) => !normalizedQuery || c.name.toLowerCase().includes(normalizedQuery),
  );

  const selectedData = allCustomers.find((c) => c.name === selectedCustomer);
  const customerAssets = selectedData
    ? assets.filter((a) => customerForAsset(a) === selectedData.name)
    : [];

  const [composingFor, setComposingFor] = React.useState<{
    company: string;
    contact: { email: string; name: string };
    context?: CustomerContactRequest;
  } | null>(null);
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
            Companies & Clients
          </h2>
        </div>
      </div>

      {toastMsg && (
        <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
          ✓ {toastMsg}
        </div>
      )}

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="gap-4 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">All Companies</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredCustomers.length} matching companies
            </p>
          </div>
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search companies"
              className="h-10 pl-11"
              aria-label="Search customers"
            />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/50 text-[10px] font-bold tracking-[0.08em] text-muted-foreground">
                <th className="px-5 py-3.5">Company Name</th>
                <th className="px-5 py-3.5">Contact Email</th>
                <th className="px-5 py-3.5">Sites / Locations</th>
                <th className="px-5 py-3.5">Checked-out</th>
                <th className="px-5 py-3.5 text-right">Quick Message</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((cust) => {
                const contact = getCustomerContact(cust.name);
                return (
                  <tr
                    key={cust.name}
                    className="group border-b border-border/70 transition-colors hover:bg-muted/30"
                  >
                    <td
                      onClick={() => onSelectCustomer(cust.name)}
                      className="cursor-pointer px-5 py-4 font-semibold text-foreground hover:underline"
                    >
                      {cust.name}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {contact.email}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {cust.sites.map((s) => s.name).join(", ") || "No sites"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          cust.activeCount > 0 ? "checkedOut" : "outline"
                        }
                      >
                        {cust.activeCount} assets
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setComposingFor({ company: cust.name, contact });
                        }}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Compose
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && (
            <div className="px-6 py-14 text-center text-muted-foreground">
              No companies match your search.
            </div>
          )}
        </div>
      </Card>

      <Dialog
        open={Boolean(selectedData)}
        onOpenChange={(open) => !open && onSelectCustomer(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>{selectedData?.name}</DialogTitle>
                <DialogDescription>
                  {selectedData?.sites.length} operating sites ·{" "}
                  {selectedData
                    ? getCustomerContact(selectedData.name).email
                    : ""}
                </DialogDescription>
              </div>
              {selectedData && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const contact = getCustomerContact(selectedData.name);
                    setComposingFor({ company: selectedData.name, contact });
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email {selectedData.name}
                </Button>
              )}
            </div>
          </DialogHeader>
          {contactRequest && contactRequest.customerName === selectedData?.name && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    Contact customer?
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {contactRequest.operatorName} is assigned to {contactRequest.assetName} at {contactRequest.siteName}.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onDismissContactRequest}
                >
                  Not now
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const contact = getCustomerContact(contactRequest.customerName);
                    setComposingFor({
                      company: contactRequest.customerName,
                      contact,
                      context: contactRequest,
                    });
                    onDismissContactRequest();
                  }}
                >
                  <Mail className="h-3.5 w-3.5" />
                  Contact customer
                </Button>
              </div>
            </div>
          )}
          <div className="mt-4">
            <h3 className="mb-3 text-sm font-bold">
              Equipment across all {selectedData?.name} sites
            </h3>
            {customerAssets.length > 0 ? (
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                {customerAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className={cn(
                      "flex items-center justify-between rounded-xl border border-border p-3",
                      asset.id === contactRequest?.assetId &&
                        "border-primary/60 bg-primary/5",
                    )}
                  >
                    <div>
                      <p className="text-sm font-bold">{asset.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {asset.id} • {asset.site} • Operated by{" "}
                        {asset.operator || "Unknown"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        asset.status === "checked-out"
                          ? "checkedOut"
                          : "available"
                      }
                    >
                      {asset.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No equipment currently assigned to this company.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {composingFor && (
        <ComposeEmailDialog
          open={Boolean(composingFor)}
          onClose={() => setComposingFor(null)}
          recipientEmail={composingFor.contact.email}
          recipientName={composingFor.contact.name}
          companyName={composingFor.company}
          assetId={composingFor.context?.assetId}
          assetName={composingFor.context?.assetName}
          siteName={composingFor.context?.siteName}
          defaultTemplate={composingFor.context ? "general" : undefined}
          onSuccess={(msg) => setToastMsg(msg)}
        />
      )}
    </div>
  );
}

const EMAIL_TEMPLATE_OPTIONS: { key: EmailTemplateKey; label: string }[] = [
  { key: "telemetry-alert", label: "Telemetry alert" },
  { key: "maintenance", label: "Maintenance required" },
  { key: "low-fuel", label: "Low fuel" },
  { key: "rental-overdue", label: "Rental overdue" },
  { key: "rental-extension", label: "Rental extension" },
  { key: "general", label: "General update" },
];

function buildEmailTemplate(
  key: EmailTemplateKey,
  context: {
    recipientName: string;
    companyName: string;
    assetId?: string;
    assetName?: string;
    siteName?: string;
  },
) {
  const asset = context.assetName ?? "rented equipment";
  const assetId = context.assetId ? ` (${context.assetId})` : "";
  const site = context.siteName ?? "your site";
  const greeting = `Hi ${context.recipientName},`;

  switch (key) {
    case "telemetry-alert":
      return {
        subject: `Telemetry alert — ${asset}${assetId}`,
        body: `${greeting}\n\nOur monitoring system flagged an unusual telemetry pattern on ${asset}${assetId} at ${site}. Please pause operation if the machine is behaving unexpectedly and reply so our team can coordinate a review.\n\nRegards,\nCTRL+CAT Operations`,
      };
    case "maintenance":
      return {
        subject: `Maintenance required — ${asset}${assetId}`,
        body: `${greeting}\n\n${asset}${assetId} at ${site} requires a maintenance review before its next work cycle. Please confirm a suitable inspection window with your site team.\n\nRegards,\nCTRL+CAT Operations`,
      };
    case "low-fuel":
      return {
        subject: `Low fuel notice — ${asset}${assetId}`,
        body: `${greeting}\n\nFuel telemetry for ${asset}${assetId} at ${site} is below the recommended operating level. Please arrange refuelling before the next work cycle to avoid downtime.\n\nRegards,\nCTRL+CAT Operations`,
      };
    case "rental-overdue":
      return {
        subject: `Rental return follow-up — ${asset}${assetId}`,
        body: `${greeting}\n\nOur records suggest the rental for ${asset}${assetId} may be past its expected return window. Please reply with the current status and an updated return date, or let us know if you need an extension.\n\nRegards,\nCTRL+CAT Operations`,
      };
    case "rental-extension":
      return {
        subject: `Rental extension request — ${asset}${assetId}`,
        body: `${greeting}\n\nWe are following up on the rental for ${asset}${assetId} at ${site}. Please confirm whether you need to extend the rental period and share the expected end date.\n\nRegards,\nCTRL+CAT Operations`,
      };
    case "general":
    default:
      return {
        subject: `Fleet communication — ${context.companyName}`,
        body: `${greeting}\n\nThis is a follow-up regarding ${asset}${assetId} at ${site}.\n\nRegards,\nCTRL+CAT Operations`,
      };
  }
}

function ComposeEmailDialog({
  open,
  onClose,
  recipientEmail,
  recipientName,
  companyName,
  assetId,
  assetName,
  siteName,
  defaultTemplate = "general",
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  assetId?: string;
  assetName?: string;
  siteName?: string;
  defaultTemplate?: EmailTemplateKey;
  onSuccess?: (msg: string) => void;
}) {
  const [templateKey, setTemplateKey] =
    React.useState<EmailTemplateKey>(defaultTemplate);
  const initialTemplate = buildEmailTemplate(defaultTemplate, {
    recipientName,
    companyName,
    assetId,
    assetName,
    siteName,
  });
  const [subject, setSubject] = React.useState(initialTemplate.subject);
  const [body, setBody] = React.useState(initialTemplate.body);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const template = buildEmailTemplate(defaultTemplate, {
        recipientName,
        companyName,
        assetId,
        assetName,
        siteName,
      });
      setTemplateKey(defaultTemplate);
      setSubject(template.subject);
      setBody(template.body);
      setError(null);
    }
  }, [
    open,
    defaultTemplate,
    recipientName,
    companyName,
    assetId,
    assetName,
    siteName,
  ]);

  function selectTemplate(nextKey: EmailTemplateKey) {
    const template = buildEmailTemplate(nextKey, {
      recipientName,
      companyName,
      assetId,
      assetName,
      siteName,
    });
    setTemplateKey(nextKey);
    setSubject(template.subject);
    setBody(template.body);
    setError(null);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("Please enter both a subject and message.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await triggerEmailAlert({
        toEmail: recipientEmail,
        managerName: recipientName,
        customerCompany: companyName,
        assetId,
        assetName,
        siteName,
        customSubject: subject,
        customBody: body,
        templateKey,
      });
      if (res.success) {
        onSuccess?.(res.message);
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError("Failed to send email. Check RESEND_API_KEY.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-[#8a5a00]" />
            Direct Message to {companyName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 pt-2">
          <div>
            <FieldLabel>To (Locked Recipient)</FieldLabel>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs font-semibold">
              <span className="text-foreground">{recipientName}</span>
              <span className="rounded-md bg-background px-2 py-0.5 text-muted-foreground">
                {recipientEmail}
              </span>
            </div>
          </div>

          <label>
            <FieldLabel>Start from a template</FieldLabel>
            <div className="relative mt-2">
              <select
                value={templateKey}
                onChange={(event) =>
                  selectTemplate(event.target.value as EmailTemplateKey)
                }
                className="h-10 w-full appearance-none rounded-full border border-input bg-card px-4 pr-10 text-sm text-foreground outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30"
                aria-label="Email template"
              >
                {EMAIL_TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Selecting a template replaces the current subject and message.
            </p>
          </label>

          <div>
            <FieldLabel>Subject</FieldLabel>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scheduled inspection notification"
              className="mt-1"
            />
          </div>

          <div>
            <FieldLabel>Message Body</FieldLabel>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email body here..."
              className="mt-1 min-h-[120px] w-full resize-none rounded-2xl border border-input bg-card p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={sending}
              className="gap-2"
            >
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DiagnosticHotlineDialog({
  open,
  onClose,
  assets,
  sites,
}: {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  sites: Site[];
}) {
  const [selectedAssetId, setSelectedAssetId] = React.useState(
    assets[0]?.id ?? "",
  );
  const [errorCode, setErrorCode] = React.useState(
    "DTC 102-3: Turbo Boost Pressure High",
  );
  const [phone, setPhone] = React.useState("+919999999999");
  const [calling, setCalling] = React.useState(false);
  const [callStatus, setCallStatus] = React.useState<string | null>(null);

  const selectedAsset =
    assets.find((a) => a.id === selectedAssetId) || assets[0];
  const siteObj = selectedAsset
    ? sites.find((s) => s.name === selectedAsset.site)
    : null;
  const customerName =
    siteObj?.customerName || selectedAsset?.site || "Contractor";

  const commonCodes = [
    "DTC 102-3: Turbocharger Boost Sensor Voltage High",
    "DTC 110-0: Engine Coolant Temperature Overheat (>112°C)",
    "DTC 586-7: Hydraulic Pump Relief Pressure Mechanical Mismatch",
    "DTC 190-2: Engine Crankshaft Speed Sensor Signal Erroneous",
  ];

  async function handleCall(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    setCalling(true);
    setCallStatus("Connecting operator to Cat Diagnostic AI Master…");
    try {
      const res = await triggerVoiceAlert({
        phoneNumber: phone,
        assetId: selectedAsset?.id,
        assetName: selectedAsset?.name,
        siteName: selectedAsset?.site,
        customerName: customerName,
        operatorName: selectedAsset?.operator ?? "Field Operator",
        errorCode: errorCode,
        scenario: "operator_diagnostic",
      });
      setCallStatus(
        res.success ? "✓ Live Diagnostic Call Connected!" : `✗ ${res.message}`,
      );
    } catch {
      setCallStatus("Failed to place call. Verify Vapi credentials.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Headphones className="h-5 w-5 text-[#8a5a00]" />
            24/7 Cat Telematics AI Diagnostic Hotline
          </DialogTitle>
          <DialogDescription className="text-xs">
            On-demand AI voice assistant for on-site operators & technicians to
            troubleshoot cryptic diagnostic fault codes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCall} className="space-y-4 pt-2">
          <div>
            <FieldLabel>Select Rented Machine</FieldLabel>
            <div className="relative mt-1">
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-input bg-card px-3 pr-10 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id}) · {a.site}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div>
            <FieldLabel>Diagnostic Fault Code / Symptom</FieldLabel>
            <div className="mt-1 space-y-1.5">
              {commonCodes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setErrorCode(code)}
                  className={cn(
                    "block w-full text-left rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors",
                    errorCode === code
                      ? "border-primary bg-primary/10 text-foreground font-bold"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            <Input
              value={errorCode}
              onChange={(e) => setErrorCode(e.target.value)}
              placeholder="Or type custom diagnostic symptom..."
              className="mt-2 text-xs"
            />
          </div>

          <div>
            <FieldLabel>Caller / Operator Phone Number</FieldLabel>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91..."
              className="mt-1 text-xs font-semibold tracking-tight"
            />
          </div>

          {callStatus && (
            <p className="rounded-lg bg-muted/70 p-2 text-center text-xs font-bold text-foreground">
              {callStatus}
            </p>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={calling}
            >
              Close
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={calling}
              className="gap-2 bg-primary text-primary-foreground font-bold"
            >
              <Phone className="h-3.5 w-3.5" />
              {calling ? "Connecting…" : "📞 Connect Operator to AI Hotline"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
