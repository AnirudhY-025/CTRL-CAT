"use client";

import * as React from "react";
import {
  MapPin,
  Truck,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Clock,
  ShieldCheck,
  Phone,
  Radio,
  Zap,
  ChevronRight,
  Building2,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  Crosshair,
  Gauge,
  X,
  ExternalLink,
  User,
  Fuel,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Asset, Site } from "@/lib/types";
import { triggerVoiceAlert } from "@/lib/api";
import dynamic from "next/dynamic";
const MapCanvas = dynamic(() => import("./map/map-canvas"), { ssr: false, loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">Loading Map...</div> });


interface TransitItem {
  id: string;
  assetId: string;
  assetName: string;
  category: string;
  haulerId: string;
  driverName: string;
  driverPhone: string;
  origin: string;
  destination: string;
  customerName: string;
  progress: number; // 0 to 100
  speedKmh: number;
  etaMinutes: number;
  totalDistanceKm: number;
  status: "in_transit" | "approaching" | "delivered";
  lat: number;
  lng: number;
  targetLat: number;
  targetLng: number;
  startLat: number;
  startLng: number;
  waypoints?: [number, number][];
}

const INITIAL_TRANSIT_ITEMS: TransitItem[] = [
  {
    id: "TR-801",
    assetId: "EQX1001",
    assetName: "CAT 320 GC Excavator",
    category: "Excavator",
    haulerId: "Lowboy Heavy Transport #4",
    driverName: "Rajesh Kumar",
    driverPhone: "+919876543210",
    origin: "Central Rental Yard (Bengaluru HQ)",
    destination: "Riverbend Materials (Sobha)",
    customerName: "Sobha Constructions",
    progress: 42,
    speedKmh: 48,
    etaMinutes: 18,
    totalDistanceKm: 34,
    status: "in_transit",
    startLat: 12.9716,
    startLng: 77.5946,
    targetLat: 13.0123,
    targetLng: 77.6234,
    waypoints: [
      [12.9830, 77.5980],
      [13.0010, 77.6050],
    ],
    lat: 12.9716 + (13.0123 - 12.9716) * 0.42,
    lng: 77.5946 + (77.6234 - 77.5946) * 0.42,
  },
  {
    id: "TR-802",
    assetId: "EQX1003",
    assetName: "CAT D6 Dozer",
    category: "Dozer",
    haulerId: "Flatbed Carrier #2",
    driverName: "Suresh Gowda",
    driverPhone: "+919876543211",
    origin: "Westport Logistics Site",
    destination: "Central Rental Yard (Return)",
    customerName: "L&T Infrastructure",
    progress: 78,
    speedKmh: 52,
    etaMinutes: 8,
    totalDistanceKm: 28,
    status: "approaching",
    startLat: 12.9234,
    startLng: 77.6712,
    targetLat: 12.9716,
    targetLng: 77.5946,
    waypoints: [
      [12.9350, 77.6400],
      [12.9520, 77.6100],
    ],
    lat: 12.9234 + (12.9716 - 12.9234) * 0.78,
    lng: 77.6712 + (77.5946 - 77.6712) * 0.78,
  },
  {
    id: "TR-803",
    assetId: "EQX1005",
    assetName: "CAT 950M Wheel Loader",
    category: "Wheel Loader",
    haulerId: "Multi-Axle Trailer #1",
    driverName: "Vikram Singh",
    driverPhone: "+919876543212",
    origin: "Central Rental Yard (Bengaluru HQ)",
    destination: "Northline Expansion (Prestige)",
    customerName: "Prestige Group",
    progress: 15,
    speedKmh: 41,
    etaMinutes: 38,
    totalDistanceKm: 46,
    status: "in_transit",
    startLat: 12.9716,
    startLng: 77.5946,
    targetLat: 13.0512,
    targetLng: 77.5512,
    waypoints: [
      [12.9950, 77.5750],
      [13.0250, 77.5600],
    ],
    lat: 12.9716 + (13.0512 - 12.9716) * 0.15,
    lng: 77.5946 + (77.5512 - 77.5946) * 0.15,
  },
];

const MAP_SITES = [
  { id: "S_001", name: "Central Rental Yard", code: "S_001", lat: 12.9716, lng: 77.5946, type: "yard", customer: "CAT Rental HQ" },
  { id: "S_003", name: "Riverbend Materials", code: "S_003", lat: 13.0123, lng: 77.6234, type: "customer", customer: "Sobha Constructions" },
  { id: "S_002", name: "Northline Expansion", code: "S_002", lat: 13.0512, lng: 77.5512, type: "customer", customer: "Prestige Group" },
  { id: "S_004", name: "Westport Logistics", code: "S_004", lat: 12.9234, lng: 77.6712, type: "customer", customer: "L&T Infrastructure" },
];

// Helper to project equipment onto map coordinates around their assigned site
function getEquipmentCoords(asset: Asset, index: number): { lat: number; lng: number } {
  // Check if asset is currently in transit
  const transit = INITIAL_TRANSIT_ITEMS.find((t) => t.assetId === asset.id);
  if (transit) {
    return { lat: transit.lat, lng: transit.lng };
  }

  // Find site coordinate
  const site = MAP_SITES.find((s) => s.name.toLowerCase().includes(asset.site.toLowerCase()) || s.code === asset.siteId) || MAP_SITES[0];
  
  // Apply a small deterministic offset around the site center
  const angle = (index * 60) * (Math.PI / 180);
  const radius = 3.5; // % offset
  return {
    lat: site.lat + Math.cos(angle) * 0.005,
    lng: site.lng + Math.sin(angle) * 0.005,
  };
}

export function SitesView({
  sites,
  assets,
}: {
  sites: Site[];
  assets: Asset[];
}) {
  const [transitList, setTransitList] = React.useState<TransitItem[]>(INITIAL_TRANSIT_ITEMS);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [speedMultiplier, setSpeedMultiplier] = React.useState<number>(1);
  const [mapStyle, setMapStyle] = React.useState<"google_standard" | "google_satellite">("google_standard");
  const [filterMode, setFilterMode] = React.useState<"all" | "in_transit" | "job_sites" | "yard">("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null);
  const [selectedTransitId, setSelectedTransitId] = React.useState<string | null>(null);
  const selectedTransit = transitList.find((t) => t.id === selectedTransitId) || null;
  const [selectedSite, setSelectedSite] = React.useState<typeof MAP_SITES[0] | null>(null);
  
  const [callStatus, setCallStatus] = React.useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);

  // Real-time movement simulation loop
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTransitList((prev) =>
        prev.map((item) => {
          if (item.status === "delivered") return item;

          const step = 0.5 * speedMultiplier;
          const newProgress = Math.min(100, item.progress + step);
          const newStatus =
            newProgress >= 100
              ? "delivered"
              : newProgress > 75
              ? "approaching"
              : "in_transit";

          const frac = newProgress / 100;
          const newLat = item.startLat + (item.targetLat - item.startLat) * frac;
          const newLng = item.startLng + (item.targetLng - item.startLng) * frac;

          const remainingKm = item.totalDistanceKm * (1 - frac);
          const currentSpeed = Math.round(48 + Math.sin(Date.now() / 800 + Number(item.id.slice(-1))) * 6);
          const newEta = Math.max(0, Math.round((remainingKm / Math.max(10, currentSpeed)) * 60));

          return {
            ...item,
            progress: Math.round(newProgress * 10) / 10,
            status: newStatus,
            lat: newLat,
            lng: newLng,
            speedKmh: currentSpeed,
            etaMinutes: newEta,
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier]);

  function resetSimulation() {
    setTransitList(INITIAL_TRANSIT_ITEMS);
    setIsPlaying(true);
  }

  async function handleCallDriver(item: TransitItem) {
    setCallStatus(`Dialing hauler driver ${item.driverName} (${item.driverPhone})…`);
    try {
      const res = await triggerVoiceAlert({
        phoneNumber: item.driverPhone,
        assetId: item.assetId,
        assetName: item.assetName,
        siteName: item.destination,
        customerName: item.customerName,
        scenario: "emergency_alert",
      });
      setCallStatus(res.success ? `✓ Dispatch alert connected to ${item.driverName}` : `✗ Call failed`);
    } catch {
      setCallStatus(`✗ Call dispatch failed`);
    }
  }

  // Filtered lists
  const filteredAssets = assets.filter((asset) => {
    const isTransit = transitList.some((t) => t.assetId === asset.id && t.status !== "delivered");
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.site.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === "in_transit") return isTransit;
    if (filterMode === "job_sites") return !isTransit && asset.site !== "Central Rental Yard";
    if (filterMode === "yard") return !isTransit && asset.site === "Central Rental Yard";
    return true;
  });

  const inTransitAssets = transitList.filter((t) => t.status !== "delivered");

  return (
    <div className="space-y-5">
      {/* Top Header & Mode Controls */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-bold tracking-[0.08em] text-[#8a5a00]">
              GOOGLE MAPS OPERATIONAL TELEMATICS
            </p>
          </div>
          <h2 className="mt-1 text-3xl font-black tracking-[-0.04em] text-foreground">
            Live Fleet GPS & Transit Map
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Precision location tracking of all {assets.length} Caterpillar assets across active construction sites & haulers in transit.
          </p>
        </div>

        {/* Live Simulation Controls Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            className="gap-1.5 font-bold text-xs"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Pause Simulation
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" /> Resume GPS Feed
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetSimulation}
            className="gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Reset hauler positions"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Routes
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-1">
            {[1, 2, 5].map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => setSpeedMultiplier(mult)}
                className={`rounded-lg px-2 py-1 text-[11px] font-extrabold transition-colors ${
                  speedMultiplier === mult
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Strips & Search Bar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: `All Equipment (${assets.length})` },
            { id: "in_transit", label: `In Transit (${inTransitAssets.length})` },
            { id: "job_sites", label: "At Job Sites" },
            { id: "yard", label: "Central Yard" },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setFilterMode(mode.id as typeof filterMode)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                filterMode === mode.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "border border-border/80 bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter machine ID, site, customer..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      {/* GOOGLE MAPS CONTAINER & MANIFEST GRID */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_1fr]">
        
        <Card className="relative overflow-hidden border-2 border-border shadow-xl rounded-2xl bg-card">
          <div className="h-[520px] w-full">
            <MapCanvas
              sites={MAP_SITES as any}
              transitItems={transitList as any}
              selectedSite={selectedSite as any}
              selectedTransit={selectedTransit as any}
              onSelectSite={setSelectedSite}
              onSelectTransit={(t) => setSelectedTransitId(t ? t.id : null)}
              assets={assets}
              onSelectAsset={setSelectedAsset}
            />
          </div>
        </Card>
        {/* IN-TRANSIT & FLEET MANIFEST SIDEBAR */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#8a5a00]" />
                  Active In-Transit Haulers
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {inTransitAssets.length} Moving
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {transitList.map((item) => {
                const isSelected = selectedTransit?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedTransitId(item.id);
                      const assetObj = assets.find((a) => a.id === item.assetId) || null;
                      setSelectedAsset(assetObj);
                      setSelectedSite(null);
                    }}
                    className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/80 bg-card hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-foreground">{item.assetName}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {item.assetId}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground font-medium">
                          {item.haulerId} · Driver: {item.driverName}
                        </p>
                      </div>
                      <Badge
                        className={
                          item.status === "delivered"
                            ? "bg-emerald-600 text-white"
                            : item.status === "approaching"
                            ? "bg-amber-500 text-white animate-pulse"
                            : "bg-blue-600 text-white"
                        }
                      >
                        {item.status === "delivered"
                          ? "Delivered"
                          : item.status === "approaching"
                          ? "Approaching"
                          : "In Transit"}
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                        <span>{item.origin.split(" ")[0]}</span>
                        <span className="text-foreground font-bold">{item.progress}% ({item.speedKmh} km/h)</span>
                        <span>{item.destination.split(" ")[0]}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-[#8a5a00]" />
                        <span>ETA: <strong className="text-foreground">{item.etaMinutes} mins</strong> remaining</span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleCallDriver(item); }}
                        className="h-7 text-[11px] gap-1 font-bold border-primary/40 text-foreground hover:bg-primary/20"
                      >
                        <Phone className="h-3 w-3 text-primary" />
                        Call Hauler
                      </Button>
                    </div>
                  </div>
                );
              })}

              {callStatus && (
                <p className="rounded-xl bg-muted/80 p-2.5 text-center text-xs font-bold text-foreground">
                  {callStatus}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



