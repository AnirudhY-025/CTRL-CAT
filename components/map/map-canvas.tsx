"use client";

import React, { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation,
  Clock,
  Truck,
  MapPin,
  Flag,
  CheckCircle2,
  ShieldCheck,
  Phone,
  X,
} from "lucide-react";
import type { Asset } from "@/lib/types";

// Safe leaflet icon setup
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

export interface Site {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  type: string;
  customer: string;
}

export interface TransitItem {
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

interface MapCanvasProps {
  sites: Site[];
  transitItems: TransitItem[];
  selectedSite: Site | null;
  selectedTransit: TransitItem | null;
  onSelectSite: (site: Site | null) => void;
  onSelectTransit: (transit: TransitItem | null) => void;
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
}

const createPinIcon = (
  label: string,
  color: string,
  bg: string,
  iconHtml: string,
) => {
  const htmlString = `
    <div class="group relative flex flex-col items-center cursor-pointer -translate-x-1/2 -translate-y-full">
      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-black shadow-xl border border-white/30 whitespace-nowrap ${bg} transition-transform group-hover:scale-110">
        ${iconHtml}
        <span>${label}</span>
      </div>
      <div class="w-2 h-2 rotate-45 -mt-1 ${bg}"></div>
      <div class="w-3 h-1 bg-black/30 rounded-full blur-[1px] mt-0.5"></div>
    </div>
  `;

  return L.divIcon({
    html: htmlString,
    className: "custom-pin-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -32],
  });
};

const createVehicleIcon = (item: TransitItem, isSelected: boolean) => {
  const isApproaching = item.status === "approaching";
  const htmlString = `
    <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer">
      ${isSelected || isApproaching ? `<div class="absolute w-12 h-12 rounded-full ${isApproaching ? "bg-amber-500/40" : "bg-blue-500/40"} animate-ping"></div>` : ""}
      <div class="relative flex items-center justify-center w-10 h-10 rounded-2xl ${
        isSelected
          ? "bg-slate-950 ring-4 ring-amber-400 shadow-2xl scale-110"
          : "bg-amber-500 shadow-lg hover:scale-110 hover:bg-amber-600"
      } text-white transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 17h4V5H2v12h3"/>
          <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
          <path d="M14 17h1"/>
          <circle cx="7.5" cy="17.5" r="2.5"/>
          <circle cx="17.5" cy="17.5" r="2.5"/>
        </svg>
      </div>
      <div class="absolute -bottom-5 bg-slate-900/90 text-amber-300 font-semibold tracking-tight text-[9px] px-1.5 py-0.5 rounded shadow border border-amber-400/30 whitespace-nowrap">
        ${item.speedKmh} km/h
      </div>
    </div>
  `;

  return L.divIcon({
    html: htmlString,
    className: "custom-vehicle-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -20],
  });
};

function MapViewBoundsController({
  selectedTransit,
  selectedSite,
}: {
  selectedTransit: TransitItem | null;
  selectedSite: Site | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedTransit) {
      const points: [number, number][] = [
        [selectedTransit.startLat, selectedTransit.startLng],
        [selectedTransit.lat, selectedTransit.lng],
        [selectedTransit.targetLat, selectedTransit.targetLng],
      ];
      if (selectedTransit.waypoints) {
        points.push(...selectedTransit.waypoints);
      }
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 14,
        animate: true,
        duration: 1,
      });
    } else if (selectedSite) {
      map.flyTo([selectedSite.lat, selectedSite.lng], 14, { duration: 1 });
    }
  }, [selectedTransit, selectedSite, map]);

  return null;
}

export default function MapCanvas({
  sites,
  transitItems,
  selectedSite,
  selectedTransit,
  onSelectSite,
  onSelectTransit,
  assets,
  onSelectAsset,
}: MapCanvasProps) {
  const defaultCenter: [number, number] = [12.985, 77.61];

  // Helper to split polyline into completed vs remaining
  const activeRouteSegments = useMemo(() => {
    if (!selectedTransit) return null;

    const allPoints: [number, number][] = [
      [selectedTransit.startLat, selectedTransit.startLng],
      ...(selectedTransit.waypoints || []),
      [selectedTransit.targetLat, selectedTransit.targetLng],
    ];

    return {
      startPoint: [selectedTransit.startLat, selectedTransit.startLng] as [
        number,
        number,
      ],
      currentPoint: [selectedTransit.lat, selectedTransit.lng] as [
        number,
        number,
      ],
      destinationPoint: [
        selectedTransit.targetLat,
        selectedTransit.targetLng,
      ] as [number, number],
      fullPath: allPoints,
    };
  }, [selectedTransit]);

  return (
    <div className="w-full h-full relative z-0 isolate overflow-hidden rounded-xl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .leaflet-container {
          width: 100%;
          height: 100%;
          z-index: 0;
          font-family: inherit;
        }
        .custom-pin-icon, .custom-vehicle-icon {
          background: transparent;
          border: none;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2);
        }
        .leaflet-popup-content {
          margin: 0;
          line-height: 1.4;
        }
      `,
        }}
      />

      <MapContainer center={defaultCenter} zoom={11} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewBoundsController
          selectedTransit={selectedTransit}
          selectedSite={selectedSite}
        />

        {/* 1. DRAW ALL INACTIVE BACKGROUND TRANSIT PATHS */}
        {transitItems.map((item) => {
          const isSelected = selectedTransit?.id === item.id;
          if (isSelected) return null; // Drawn specially below

          const pathPoints: [number, number][] = [
            [item.startLat, item.startLng],
            ...(item.waypoints || []),
            [item.targetLat, item.targetLng],
          ];

          return (
            <Polyline
              key={`route-${item.id}`}
              positions={pathPoints}
              pathOptions={{
                color: "#94a3b8",
                weight: 3,
                dashArray: "6, 8",
                opacity: 0.5,
              }}
              eventHandlers={{
                click: () => onSelectTransit(item),
              }}
            />
          );
        })}

        {/* 2. DRAW ACTIVE SELECTED VEHICLE PATHWAY (START -> CURRENT -> DESTINATION) */}
        {activeRouteSegments && selectedTransit && (
          <>
            {/* Traveled Path (Start -> Current) */}
            <Polyline
              positions={[
                activeRouteSegments.startPoint,
                activeRouteSegments.currentPoint,
              ]}
              pathOptions={{
                color: "#10b981", // Emerald solid
                weight: 5,
                opacity: 0.9,
              }}
            />

            {/* Remaining Path (Current -> Destination) */}
            <Polyline
              positions={[
                activeRouteSegments.currentPoint,
                activeRouteSegments.destinationPoint,
              ]}
              pathOptions={{
                color: "#f59e0b", // Amber dashed
                weight: 5,
                dashArray: "8, 10",
                opacity: 0.95,
              }}
            />

            {/* START POINT MARKER (ORIGIN) */}
            <Marker
              position={activeRouteSegments.startPoint}
              icon={createPinIcon(
                `ORIGIN: ${selectedTransit.origin.split(" ")[0]}`,
                "#059669",
                "bg-emerald-600",
                `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`,
              )}
            >
              <Popup>
                <div className="p-3 text-xs">
                  <span className="font-extrabold text-emerald-700 uppercase tracking-wide text-[10px]">
                    Route Origin
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedTransit.origin}
                  </p>
                  <p className="text-slate-500 mt-1">
                    Dispatched from CAT Logistics Depot
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* FINAL LOCATION MARKER (DESTINATION) */}
            <Marker
              position={activeRouteSegments.destinationPoint}
              icon={createPinIcon(
                `DESTINATION: ${selectedTransit.destination.split(" ")[0]}`,
                "#dc2626",
                "bg-rose-600",
                `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
              )}
            >
              <Popup>
                <div className="p-3 text-xs">
                  <span className="font-extrabold text-rose-700 uppercase tracking-wide text-[10px]">
                    Destination Site
                  </span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {selectedTransit.destination}
                  </p>
                  <p className="text-slate-500 mt-1">
                    Client: <strong>{selectedTransit.customerName}</strong>
                  </p>
                  <p className="text-amber-700 font-semibold mt-1">
                    ETA: {selectedTransit.etaMinutes} mins remaining
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* 3. DRAW SITES & DEPOTS */}
        {sites.map((site) => {
          const isYard = site.type === "yard";
          const isSelected = selectedSite?.id === site.id;

          return (
            <Marker
              key={site.id}
              position={[site.lat, site.lng]}
              icon={createPinIcon(
                site.name,
                isYard ? "#0f172a" : "#2563eb",
                isYard ? "bg-slate-900" : "bg-blue-600",
                isYard
                  ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><path d="M9 22v-4h6v4"/></svg>`
                  : `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
              )}
              eventHandlers={{
                click: () => onSelectSite(site),
              }}
            >
              <Popup>
                <div className="p-3 text-xs">
                  <span
                    className={`font-black text-[10px] uppercase tracking-wider ${isYard ? "text-amber-600" : "text-blue-600"}`}
                  >
                    {isYard ? "Central Operations Depot" : "Customer Job Site"}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900 mt-0.5">
                    {site.name}
                  </h3>
                  <p className="text-slate-500">{site.customer}</p>
                  <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Site ID:</span>
                    <strong className="font-semibold tracking-tight text-slate-800">
                      {site.code}
                    </strong>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 4. DRAW VEHICLES / HAULERS */}
        {transitItems.map((item) => {
          const isSelected = selectedTransit?.id === item.id;

          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={createVehicleIcon(item, isSelected)}
              eventHandlers={{
                click: () => {
                  onSelectTransit(item);
                  const asset = assets.find((a) => a.id === item.assetId);
                  if (asset) onSelectAsset(asset);
                },
              }}
            >
              <Popup>
                <div className="p-3 text-xs w-64">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                      {item.id}
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {item.speedKmh} km/h
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-2">
                    {item.assetName}
                  </h3>
                  <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                    {item.haulerId}
                  </p>

                  <div className="mt-3 space-y-1.5 border-t pt-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Flag className="h-3 w-3 text-emerald-600" /> Start:
                      </span>
                      <strong className="text-slate-800 truncate max-w-[130px]">
                        {item.origin.split(" ")[0]}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-rose-600" />{" "}
                        Destination:
                      </span>
                      <strong className="text-slate-800 truncate max-w-[130px]">
                        {item.destination.split(" ")[0]}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-600" /> Live ETA:
                      </span>
                      <span className="text-amber-700 font-bold">
                        {item.etaMinutes} mins remaining
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-3 w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-lg shadow transition-colors flex items-center justify-center gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      const asset = assets.find((a) => a.id === item.assetId);
                      if (asset) onSelectAsset(asset);
                    }}
                  >
                    <Truck className="h-3.5 w-3.5" />
                    Inspect Asset Telemetry
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* 5. FLOATING TELEMETRY HUD WHEN A VEHICLE IS SELECTED */}
      {selectedTransit && (
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-[1000] bg-slate-900/95 text-white backdrop-blur-md p-4 rounded-2xl border border-slate-700 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black text-[10px]">
                  LIVE ROUTE
                </span>
                <span className="text-xs font-bold tracking-tight text-amber-300">
                  {selectedTransit.id}
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-white mt-1">
                {selectedTransit.assetName}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => onSelectTransit(null)}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Route path progress */}
          <div className="mt-3 bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {selectedTransit.origin.split(" ")[0]}
              </span>
              <span className="text-[11px] font-semibold tracking-tight text-slate-400">
                {selectedTransit.progress}% completed
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <MapPin className="h-3 w-3" />
                {selectedTransit.destination.split(" ")[0]}
              </span>
            </div>

            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-300"
                style={{ width: `${selectedTransit.progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium pt-1">
              <span>
                Speed:{" "}
                <strong className="text-amber-400 font-bold">
                  {selectedTransit.speedKmh} km/h
                </strong>
              </span>
              <span>
                ETA:{" "}
                <strong className="text-white font-bold">
                  {selectedTransit.etaMinutes} mins
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
