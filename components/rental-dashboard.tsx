"use client";

import {
  Activity as ActivityIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Construction,
  Gauge,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  QrCode,
  Search,
  Settings2,
  Truck,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { initialActivity, initialAssets, operators, sites } from "@/lib/data";
import type { Activity, Asset, AssetStatus, Condition, WorkflowAction } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterStatus = AssetStatus | "all" | "attention";

const workflowItems: { label: string; action: WorkflowAction; icon: typeof ArrowUpFromLine }[] = [
  { label: "Check out", action: "checkout", icon: ArrowUpFromLine },
  { label: "Check in", action: "checkin", icon: ArrowDownToLine },
];

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: false },
  { label: "Equipment", icon: Boxes, active: true },
  { label: "Assignments", icon: Package, active: false },
  { label: "Sites & locations", icon: MapPin, active: false },
  { label: "Operators", icon: UsersRound, active: false },
  { label: "Activity", icon: BarChart3, active: false },
];

const utilityItems = [
  { label: "Notifications", icon: Bell, count: 3 },
  { label: "Settings", icon: Settings2 },
];

const statusLabels: Record<AssetStatus, string> = {
  available: "Available",
  "checked-out": "Checked out",
  maintenance: "Maintenance",
};

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

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function isAssetEligible(asset: Asset, action: WorkflowAction) {
  return action === "checkout" ? asset.status === "available" : asset.status === "checked-out";
}

function eligibilityMessage(action: WorkflowAction) {
  return action === "checkout"
    ? "Only available equipment can be checked out."
    : "Only checked-out equipment can be checked in.";
}

function assetTone(category: string) {
  if (category === "Excavator") return "bg-[#f6e1d2] text-[#a85e3d]";
  if (category === "Dozer") return "bg-[#e4e8fb] text-[#656cb4]";
  if (category === "Wheel loader") return "bg-[#e9f0c9] text-[#73852b]";
  if (category === "Haul truck") return "bg-[#f8ead0] text-[#a36d2f]";
  return "bg-[#f7dfe6] text-[#b15f7c]";
}

export function RentalDashboard() {
  const [assets, setAssets] = React.useState(initialAssets);
  const [activity, setActivity] = React.useState(initialActivity);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("all");
  const [action, setAction] = React.useState<WorkflowAction | null>(null);
  const [selectedAssetId, setSelectedAssetId] = React.useState<string | null>(null);
  const [workflowAssetId, setWorkflowAssetId] = React.useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const counts = {
    all: assets.length,
    available: assets.filter((asset) => asset.status === "available").length,
    "checked-out": assets.filter((asset) => asset.status === "checked-out").length,
    maintenance: assets.filter((asset) => asset.status === "maintenance").length,
    attention: assets.filter((asset) => asset.condition !== "Good" || asset.fuelLevel < 50).length,
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesStatus = statusFilter === "all"
      ? true
      : statusFilter === "attention"
        ? asset.condition !== "Good" || asset.fuelLevel < 50
        : asset.status === statusFilter;
    const normalizedQuery = query.toLowerCase();
    const matchesQuery = !normalizedQuery || [asset.id, asset.name, asset.site, asset.location, asset.operator ?? ""]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesStatus && matchesQuery;
  });

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

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  function handleWorkflowComplete(updatedAsset: Asset, message: string, activityItem: Activity) {
    setAssets((current) => current.map((asset) => asset.id === updatedAsset.id ? updatedAsset : asset));
    setActivity((current) => [activityItem, ...current].slice(0, 5));
    setAction(null);
    setSelectedAssetId(null);
    setWorkflowAssetId(null);
    setSelectedActivityId(null);
    showToast(message);
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <aside className="hidden min-h-screen w-[248px] shrink-0 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(213,245,77,0.18)]"><Wrench className="h-5 w-5" strokeWidth={2.5} /></div>
          <div><p className="text-sm font-black tracking-tight">Caterpillar</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">Rental operations</p></div>
        </div>

        <div className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">Workspace</div>
        <nav className="mt-3 space-y-1" aria-label="Rental operations navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return <div key={item.label} aria-current={item.active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", item.active ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(213,245,77,0.12)]" : "text-sidebar-muted")}><Icon className="h-[17px] w-[17px]" strokeWidth={1.8} /><span>{item.label}</span>{item.active && <ChevronRight className="ml-auto h-4 w-4" />}</div>;
          })}
        </nav>

        <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">Manage</div>
        <div className="mt-3 space-y-1">
          {utilityItems.map((item) => {
            const Icon = item.icon;
            return <div key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-muted"><Icon className="h-[17px] w-[17px]" strokeWidth={1.8} /><span>{item.label}</span>{item.count && <span className="ml-auto rounded-full bg-[#f7d8c3] px-2 py-0.5 text-[10px] font-bold text-[#8d5036]">{item.count}</span>}</div>;
          })}
        </div>

        <div className="mt-auto rounded-2xl bg-primary p-4 text-primary-foreground"><div className="mb-5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15"><Construction className="h-5 w-5" /></div><p className="text-sm font-bold">Keep the fleet moving.</p><p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">Review equipment health before the next dispatch.</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full w-[72%] rounded-full bg-primary-foreground" /></div><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/70">72% fleet readiness</p></div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10">
            <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar text-primary lg:hidden"><Menu className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Tuesday, September 1, 2026</p><h1 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">Good morning, Taylor <span aria-hidden="true">👋</span></h1></div></div>
            <div className="hidden items-center gap-3 sm:flex"><div className="relative w-[210px] lg:w-[260px]"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search equipment" className="h-11 pl-11" aria-label="Search equipment" /></div><Button type="button" variant="outline" size="icon" aria-label="Notifications"><Bell className="h-4 w-4" /></Button><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4e8fb] text-xs font-black text-[#656cb4]">TO</div></div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a9e2a]">Operations center</p><h2 className="mt-1 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Equipment overview</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Keep every machine accounted for, ready for its next assignment, and visible to your team.</p></div><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><CircleCheck className="h-4 w-4 text-[#82a51e]" /><span className="font-black text-foreground">{counts.available} machines</span> ready to deploy</div></div>
          <OverviewStats counts={counts} />
          <StatusFilterStrip counts={counts} value={statusFilter} onChange={setStatusFilter} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card className="overflow-hidden"><CardHeader className="gap-4 border-b border-border/70 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="text-base">Equipment status</CardTitle><p className="mt-1 text-xs text-muted-foreground">Select an asset to inspect details or update its movement.</p></div><div className="relative w-full sm:w-[230px] sm:hidden"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search equipment" className="pl-11" aria-label="Search equipment" /></div></CardHeader><div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left"><thead><tr className="border-b border-border/70 bg-muted/50 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"><th className="px-5 py-3.5 font-bold">Equipment</th><th className="px-3 py-3.5 font-bold">Status</th><th className="px-3 py-3.5 font-bold">Site / location</th><th className="px-5 py-3.5 text-right font-bold">Actions</th></tr></thead><tbody>{filteredAssets.map((asset) => <AssetRow key={asset.id} asset={asset} onOpen={openAsset} onAction={openAction} />)}</tbody></table>{filteredAssets.length === 0 && <div className="px-6 py-14 text-center text-sm text-muted-foreground">No equipment matches your current filters.</div>}</div><div className="border-t border-border/70 px-5 py-3.5 text-xs text-muted-foreground">Showing <span className="font-bold text-foreground">{filteredAssets.length}</span> of {assets.length} assets</div></Card>

            <Card className="h-fit"><CardHeader className="flex-row items-start justify-between"><div><CardTitle className="text-base">Recent activity</CardTitle><p className="mt-1 text-xs text-muted-foreground">Latest fleet movements and signals.</p></div><button type="button" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open activity"><ChevronRight className="h-4 w-4" /></button></CardHeader><CardContent className="space-y-1">{activity.map((item, index) => <ActivityItem key={item.id} item={item} isLast={index === activity.length - 1} onOpen={() => openAsset(item.assetId, item.id)} />)}</CardContent></Card>
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-sidebar px-5 py-4 text-sidebar-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><ActivityIcon className="h-4 w-4" /></div><div><p className="text-sm font-bold">Movement actions</p><p className="text-xs text-sidebar-muted">Record equipment movement from anywhere in the dashboard.</p></div></div><div className="flex gap-2">{workflowItems.map((item) => { const Icon = item.icon; return <Button key={item.action} type="button" onClick={() => openAction(item.action)} variant={item.action === "checkout" ? "default" : "secondary"} size="sm" className="gap-2"><Icon className="h-3.5 w-3.5" />{item.label}</Button>; })}</div></div>
        </main>
      </div>

      <AssetDetailDrawer asset={selectedAsset} activities={activity} selectedActivityId={selectedActivityId} onClose={closeAsset} onAction={openAction} />
      <WorkflowDrawer action={action} assets={assets} selectedAssetId={workflowAssetId ?? ""} onSelectedAssetChange={setWorkflowAssetId} onClose={() => { setAction(null); setWorkflowAssetId(null); }} onComplete={handleWorkflowComplete} />
      {toast && <div role="status" className="fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-[0_14px_36px_rgba(35,34,52,0.14)]"><Check className="h-4 w-4 shrink-0" />{toast}<button type="button" onClick={() => setToast(null)} className="ml-2 text-emerald-500/70 hover:text-emerald-700" aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div>}
    </div>
  );
}

function OverviewStats({ counts }: { counts: Record<FilterStatus, number> }) {
  const stats = [
    { label: "Total equipment", value: counts.all, detail: "Across all sites", icon: Boxes, tone: "bg-[#e4e8fb] text-[#656cb4]" },
    { label: "Ready to deploy", value: counts.available, detail: "Available now", icon: CircleCheck, tone: "bg-[#e9f5bb] text-[#708b1d]" },
    { label: "In the field", value: counts["checked-out"], detail: "Currently assigned", icon: Truck, tone: "bg-[#f6e1d2] text-[#a85e3d]" },
    { label: "Needs attention", value: counts.attention, detail: "Review required", icon: CircleAlert, tone: "bg-[#f8ead0] text-[#a36d2f]" },
  ];
  return <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_8px_22px_rgba(35,34,52,0.03)]"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", stat.tone)}><Icon className="h-[18px] w-[18px]" /></div><div className="min-w-0"><p className="text-2xl font-black tracking-tight">{stat.value}</p><p className="truncate text-xs font-bold text-foreground">{stat.label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{stat.detail}</p></div></div>; })}</div>;
}

function StatusFilterStrip({ counts, value, onChange }: { counts: Record<FilterStatus, number>; value: FilterStatus; onChange: (value: FilterStatus) => void }) {
  const filters: { value: FilterStatus; label: string; color: string }[] = [
    { value: "all", label: "All equipment", color: "bg-foreground" },
    { value: "available", label: "Available", color: "bg-emerald-500" },
    { value: "checked-out", label: "Checked out", color: "bg-amber-500" },
    { value: "maintenance", label: "Maintenance", color: "bg-red-500" },
    { value: "attention", label: "Needs attention", color: "bg-violet-500" },
  ];
  return <div className="mb-6 flex flex-wrap items-center gap-1 rounded-2xl border border-border/70 bg-card p-1.5 shadow-[0_8px_22px_rgba(35,34,52,0.03)]" role="group" aria-label="Filter equipment status">{filters.map((filter) => <button key={filter.value} type="button" aria-pressed={value === filter.value} onClick={() => onChange(filter.value)} className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors", value === filter.value ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><span className={cn("h-1.5 w-1.5 rounded-full", filter.color)} />{filter.label}<span className={cn("rounded-full bg-muted px-1.5 py-0.5 text-[10px]", value === filter.value ? "text-[#708b1d]" : "text-muted-foreground")}>{counts[filter.value]}</span></button>)}</div>;
}

function AssetRow({ asset, onOpen, onAction }: { asset: Asset; onOpen: (assetId: string) => void; onAction: (action: WorkflowAction, assetId?: string) => void }) {
  return <tr className="group border-b border-border/60 transition-colors last:border-0 hover:bg-accent/40"><td className="px-5 py-4"><button type="button" onClick={() => onOpen(asset.id)} className="flex max-w-full items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black", assetTone(asset.category))}>{asset.category.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground group-hover:text-[#708b1d]">{asset.name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{asset.id} · {asset.serialNumber}</p></div></button></td><td className="px-3 py-4"><Badge variant={statusVariant(asset.status)}>{statusLabels[asset.status]}</Badge></td><td className="px-3 py-4"><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" /><div><p className="max-w-[180px] truncate text-xs font-semibold text-foreground">{asset.site}</p><p className="mt-0.5 max-w-[180px] truncate text-[11px] text-muted-foreground">{asset.location}</p></div></div></td><td className="px-5 py-4"><div className="flex justify-end"><Button type="button" variant={asset.status === "available" ? "default" : "outline"} size="sm" onClick={() => asset.status !== "maintenance" && onAction(asset.status === "available" ? "checkout" : "checkin", asset.id)} disabled={asset.status === "maintenance"} className="h-8 px-3 text-[11px]">{asset.status === "available" ? "Check out" : asset.status === "checked-out" ? "Check in" : "In maintenance"}</Button></div></td></tr>;
}

function ActivityItem({ item, isLast, onOpen, highlighted = false }: { item: Activity; isLast: boolean; onOpen?: () => void; highlighted?: boolean }) {
  const tones = { amber: "bg-amber-400", blue: "bg-indigo-400", green: "bg-emerald-500", red: "bg-red-400" };
  const content = <><div className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center"><span className={cn("h-2 w-2 rounded-full", tones[item.tone])} />{!isLast && <span className="absolute top-3 h-11 w-px bg-border" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-foreground">{item.action}</p><span className="shrink-0 text-[10px] text-muted-foreground">{item.time}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{item.assetId} · {item.detail}</p></div></>;
  const className = cn("flex w-full gap-3 rounded-xl p-2.5 text-left transition-colors", onOpen && "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", highlighted && "bg-accent ring-1 ring-primary/40");
  return onOpen ? <button type="button" onClick={onOpen} className={className} aria-label={`Open ${item.action} for ${item.assetName}`}>{content}</button> : <div className={className}>{content}</div>;
}

function AssetDetailDrawer({ asset, activities, selectedActivityId, onClose, onAction }: { asset?: Asset; activities: Activity[]; selectedActivityId: string | null; onClose: () => void; onAction: (action: WorkflowAction, assetId?: string) => void }) {
  const localActivities = asset ? activities.filter((item) => item.assetId === asset.id) : [];
  const nextAction = asset?.status === "available" ? "checkout" : asset?.status === "checked-out" ? "checkin" : null;

  return <Dialog open={Boolean(asset)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader>{asset && <><div className="mb-3 flex items-center gap-3"><div className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black", assetTone(asset.category))}>{asset.category.slice(0, 2).toUpperCase()}</div><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#708b1d]">Asset details</p><p className="mt-0.5 text-xs text-muted-foreground">{asset.id} · {asset.serialNumber}</p></div></div><DialogTitle>{asset.name}</DialogTitle><DialogDescription>{asset.category} · Full operational state and recent activity.</DialogDescription></>}</DialogHeader>{asset && <div className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-5 overflow-y-auto px-6 py-6"><div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/60 p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Current status</p><div className="mt-2"><Badge variant={statusVariant(asset.status)}>{statusLabels[asset.status]}</Badge></div></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Last activity</p><p className="mt-2 text-sm font-semibold text-foreground">{asset.lastActivity}</p></div></div>
          <section className="space-y-3"><SectionLabel>Assignment & location</SectionLabel><div className="grid gap-3 sm:grid-cols-2"><InfoCell label="Operator" value={asset.operator ?? "Unassigned"} /><InfoCell label="Site" value={asset.site} /><InfoCell label="Current location" value={asset.location} /><InfoCell label="Category" value={asset.category} /></div></section>
          <section className="space-y-3"><div className="flex items-center justify-between"><SectionLabel>Machine telemetry</SectionLabel><span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-500"><span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />Static snapshot</span></div><div className="grid gap-3 sm:grid-cols-3"><TelemetryCell icon={<Gauge className="h-3.5 w-3.5" />} label="Engine hours" value={`${asset.engineHours.toLocaleString()} h`} /><TelemetryCell icon={<Clock3 className="h-3.5 w-3.5" />} label="Idle hours" value={`${asset.idleHours.toLocaleString()} h`} /><TelemetryCell icon={<ActivityIcon className="h-3.5 w-3.5" />} label="Fuel level" value={`${asset.fuelLevel}%`} /></div><p className="text-[11px] leading-relaxed text-muted-foreground">Telemetry is read-only in this prototype. Real-time machinery ingestion is deferred.</p></section>
          <section className="space-y-3"><SectionLabel>Condition</SectionLabel><div className="flex items-center justify-between rounded-2xl border border-border bg-muted/60 p-3"><Badge variant={conditionVariant(asset.condition)}>{asset.condition}</Badge><span className="text-xs text-muted-foreground">Updated with asset state</span></div></section>
          <section className="space-y-3"><div className="flex items-center justify-between"><SectionLabel>Recent activity</SectionLabel><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{localActivities.length} events</span></div>{localActivities.length > 0 ? <div className="space-y-1">{localActivities.map((item, index) => <ActivityItem key={item.id} item={item} isLast={index === localActivities.length - 1} highlighted={selectedActivityId === item.id} />)}</div> : <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">No recent activity for this asset.</div>}</section>
        </div><div className="flex items-center justify-between border-t border-border bg-muted/40 px-6 py-4"><Button type="button" variant="ghost" onClick={onClose}>Close</Button>{nextAction && <Button type="button" onClick={() => onAction(nextAction, asset.id)} className="gap-2">{nextAction === "checkout" ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}{nextAction === "checkout" ? "Check out" : "Check in"}</Button>}</div></div>}</DialogContent></Dialog>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{children}</h4>;
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-muted/50 p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1.5 truncate text-sm font-semibold text-foreground" title={value}>{value}</p></div>;
}

function TelemetryCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-muted/50 p-3"><div className="flex items-center gap-2 text-[#708b1d]">{icon}<span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</span></div><p className="mt-2 text-lg font-black text-foreground">{value}</p></div>;
}

function WorkflowDrawer({ action, assets, selectedAssetId, onSelectedAssetChange, onClose, onComplete }: { action: WorkflowAction | null; assets: Asset[]; selectedAssetId: string; onSelectedAssetChange: (value: string) => void; onClose: () => void; onComplete: (asset: Asset, message: string, activity: Activity) => void }) {
  const [form, setForm] = React.useState({ operator: operators[0].name, site: sites[0].name, location: "Zone 2 · Main workface", condition: "Good" as Condition, notes: "", returnTime: "2026-09-01T12:30" });
  const [lookup, setLookup] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setError("");
    setLookup("");
    if (selectedAssetId) {
      const selected = assets.find((asset) => asset.id === selectedAssetId);
      if (selected) setForm((current) => ({ ...current, operator: selected.operator ?? operators[0].name, site: selected.site, location: selected.location, condition: selected.condition }));
    }
  }, [action, selectedAssetId, assets]);

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);
  const selected = action && selectedAsset && isAssetEligible(selectedAsset, action) ? selectedAsset : undefined;
  const eligibleAssets = action ? assets.filter((asset) => isAssetEligible(asset, action)) : [];
  const title = action === "checkout" ? "Check out equipment" : "Check in equipment";
  const description = action === "checkout" ? "Select an available asset and capture its dispatch assignment." : "Close the movement with return time and final condition.";

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
    const match = assets.find((asset) => asset.id === value || asset.serialNumber.toUpperCase() === value);
    if (!match) { setError("No asset found. Try CAT-320-014 or scan a registered tag."); return; }
    if (!isAssetEligible(match, action)) { setError(eligibilityMessage(action)); return; }
    selectAsset(match.id);
    setLookup("");
  }

  function simulateScan() {
    const match = eligibleAssets[0];
    if (match) selectAsset(match.id);
    else setError(`No eligible equipment is available for ${title.toLowerCase()}.`);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!action || !selected) { setError(action ? eligibilityMessage(action) : "Select an asset before continuing."); return; }
    if (action === "checkout" && (!form.operator || !form.site || !form.location)) { setError("Operator, site, and location are required."); return; }
    const now = "Just now";
    const operator = operators.find((item) => item.name === form.operator);
    let updated: Asset;
    let activityItem: Activity;
    let message: string;
    if (action === "checkout") {
      updated = { ...selected, status: "checked-out", operator: form.operator, operatorInitials: operator?.initials ?? getInitials(form.operator), site: form.site, location: form.location, lastActivity: now };
      message = `${selected.id} checked out successfully`;
      activityItem = { id: `activity-${Date.now()}`, action: "Equipment checked out", assetId: selected.id, assetName: selected.name, detail: `${form.site} · ${form.operator}`, time: now, tone: "amber" };
    } else {
      updated = { ...selected, status: "available", operator: null, operatorInitials: null, site: "Rental yard", location: "Bay 01 · Return inspection", condition: form.condition, lastActivity: now };
      message = `${selected.id} checked in successfully`;
      activityItem = { id: `activity-${Date.now()}`, action: "Asset returned", assetId: selected.id, assetName: selected.name, detail: `Final condition: ${form.condition}`, time: now, tone: "green" };
    }
    onComplete(updated, message, activityItem);
  }

  return <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-[#708b1d]">{action === "checkout" ? <ArrowUpFromLine className="h-4 w-4" /> : <ArrowDownToLine className="h-4 w-4" />}</div><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{action && <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col"><div className="flex-1 space-y-5 overflow-y-auto px-6 py-6"><section><FieldLabel>Asset lookup</FieldLabel><div className="mt-2 flex gap-2"><div className="relative flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={lookup} onChange={(event) => setLookup(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), findAsset())} placeholder="Enter asset ID or serial number" className="pl-11" aria-label="Asset ID or serial number" /><button type="button" onClick={simulateScan} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-accent p-1.5 text-[#708b1d] hover:bg-primary" aria-label="Simulate QR or RFID scan"><QrCode className="h-4 w-4" /></button></div><Button type="button" variant="outline" onClick={findAsset}>Find</Button></div><p className="mt-2 text-[11px] text-muted-foreground">Eligible for this action: {eligibleAssets.length}</p>{error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}{selected && <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/40 bg-accent/40 p-3"><div className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black", assetTone(selected.category))}>{selected.category.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{selected.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{selected.id} · Current status: <span className="font-bold text-foreground">{statusLabels[selected.status]}</span></p></div><Check className="ml-auto h-4 w-4 text-emerald-600" /></div>}</section>
              {action === "checkout" && <section className="grid gap-4 sm:grid-cols-2"><Field label="Site" value={form.site} onChange={(value) => updateForm("site", value)} options={sites.map((site) => site.name)} /><Field label="Operator" value={form.operator} onChange={(value) => updateForm("operator", value)} options={operators.map((operator) => operator.name)} /><label className="sm:col-span-2"><FieldLabel>Location</FieldLabel><div className="relative mt-2"><MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={form.location} onChange={(event) => updateForm("location", event.target.value)} className="pl-11" placeholder="e.g. Zone 2 · Main workface" /></div></label></section>}
              {action === "checkin" && <section className="space-y-4"><label><FieldLabel>Return time</FieldLabel><Input type="datetime-local" value={form.returnTime} onChange={(event) => updateForm("returnTime", event.target.value)} className="mt-2" /></label><Field label="Final condition" value={form.condition} onChange={(value) => updateForm("condition", value)} options={["Good", "Monitor", "Service due"]} /><label><FieldLabel>Return notes</FieldLabel><textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30" placeholder="Document damage, fuel, or service needs..." /></label></section>}
              {action === "checkout" && <div className="rounded-2xl border border-primary/30 bg-accent/40 p-4"><div className="flex gap-3"><QrCode className="mt-0.5 h-4 w-4 shrink-0 text-[#708b1d]" /><div><p className="text-xs font-bold text-foreground">Scan-ready lookup</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Use the tag button to simulate a QR/RFID read, or enter a registered asset ID.</p></div></div></div>}</div><div className="flex items-center justify-between border-t border-border bg-muted/40 px-6 py-4"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!selected} className="gap-2"><Check className="h-4 w-4" />{action === "checkout" ? "Confirm checkout" : "Complete check-in"}</Button></div></form>}</DialogContent></Dialog>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold text-foreground">{children}</span>;
}

function Field({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label><FieldLabel>{label}</FieldLabel><div className="relative mt-2"><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-full border border-input bg-card px-4 pr-10 text-sm text-foreground outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-ring/30">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></div></label>;
}
