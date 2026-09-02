"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2, XCircle, Loader2, QrCode, MapPin,
  Wrench, Gauge, Fuel, User, Building2, ArrowUpFromLine
} from "lucide-react";

interface Asset {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  status: string;
  site: string;
  location: string;
  operator: string | null;
  condition: string;
  fuelLevel: number | null;
  engineHours: number | null;
}

interface Site { id: string; name: string; }
interface Operator { id: string; name: string; }

type Step = "loading" | "asset_found" | "not_found" | "form" | "submitting" | "success" | "error";

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>();

  const [step, setStep] = useState<Step>("loading");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  // Form state
  const [siteId, setSiteId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [newOperatorMode, setNewOperatorMode] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [location, setLocation] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Fetch asset + sites + operators in parallel
  useEffect(() => {
    async function load() {
      try {
        const [assetRes, sitesRes, opsRes] = await Promise.all([
          fetch(`/api/equipment/${id}`),
          fetch("/api/sites"),
          fetch("/api/operators"),
        ]);

        const assetJson = await assetRes.json();
        if (!assetRes.ok || !assetJson.data) {
          setStep("not_found");
          return;
        }

        const a = assetJson.data as Asset;
        setAsset(a);

        const sitesJson = await sitesRes.json();
        const siteList: Site[] = (sitesJson.data ?? []).map((s: any) => ({ id: s.id ?? s.site_id, name: s.name }));
        setSites(siteList);

        const opsJson = await opsRes.json();
        const opsList: Operator[] = (opsJson.data ?? []).map((o: any) => ({ id: o.id ?? o.operator_id, name: o.name }));
        setOperators(opsList);

        // Pre-fill from asset's current data
        const currentSite = siteList.find(s => s.name === a.site);
        setSiteId(currentSite?.id ?? siteList[0]?.id ?? "");
        setOperatorId(opsList[0]?.id ?? "");
        setLocation(a.location !== "Unassigned" ? a.location : "");

        setStep("asset_found");
      } catch {
        setStep("not_found");
      }
    }
    load();
  }, [id]);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!asset) return;
    const effectiveLocation = location.trim() || "Site Main Area";
    const effectiveOperatorId = newOperatorMode ? null : operatorId;
    if (!siteId || !effectiveLocation) {
      setErrorMsg("Site and location are required.");
      return;
    }
    if (newOperatorMode && !newOperatorName.trim()) {
      setErrorMsg("Please enter the operator's name.");
      return;
    }
    setStep("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/rentals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: asset.id,
          site_id: siteId,
          operator_id: effectiveOperatorId,
          location: effectiveLocation,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout failed");
      setSuccessMsg(json.message ?? `${asset.id} checked out successfully.`);
      setStep("success");
    } catch (err: any) {
      setErrorMsg(err.message ?? "Checkout failed.");
      setStep("form");
    }
  }

  const statusColor = (status: string) => {
    if (status === "available") return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    if (status === "checked-out") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    return "bg-red-500/15 text-red-700 border-red-500/30";
  };

  const statusLabel = (status: string) => {
    if (status === "available") return "Available";
    if (status === "checked-out") return "Checked Out";
    return status;
  };

  return (
    <div className="min-h-screen bg-[#f5f4ef] flex flex-col">
      {/* Header */}
      <div className="bg-[#181818] px-5 py-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFCD11]">
          <QrCode className="h-5 w-5 text-[#181818]" />
        </div>
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#FFCD11] uppercase">CTRL+CAT</p>
          <p className="text-sm font-black text-white">Equipment Checkout</p>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">

        {/* LOADING */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-[#FFCD11]" />
            <p className="text-sm font-semibold text-gray-500">Looking up asset <strong>{id}</strong>…</p>
          </div>
        )}

        {/* NOT FOUND */}
        {step === "not_found" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="rounded-full bg-red-100 p-4">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-lg font-black text-gray-800">Asset Not Found</p>
            <p className="text-sm text-gray-500">No machine with ID <strong>{id}</strong> was found in the system. Try scanning again.</p>
          </div>
        )}

        {/* ASSET FOUND — confirm & open form */}
        {step === "asset_found" && asset && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              {/* Asset header */}
              <div className="bg-[#181818] px-5 py-4">
                <p className="text-[10px] font-bold tracking-widest text-[#FFCD11] uppercase">{asset.category}</p>
                <p className="text-xl font-black text-white mt-0.5">{asset.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Serial: {asset.serialNumber} · ID: {asset.id}</p>
              </div>

              {/* Status badge */}
              <div className="px-5 pt-4 pb-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusColor(asset.status)}`}>
                  {statusLabel(asset.status)}
                </span>
              </div>

              {/* Telemetry grid */}
              <div className="grid grid-cols-3 gap-3 px-5 py-4 border-t border-gray-100">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Gauge className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Hours</span>
                  </div>
                  <p className="text-base font-black text-gray-800">{asset.engineHours ?? "—"}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Fuel className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Fuel</span>
                  </div>
                  <p className="text-base font-black text-gray-800">{asset.fuelLevel != null ? `${asset.fuelLevel}%` : "—"}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-gray-400">
                    <Wrench className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cond.</span>
                  </div>
                  <p className="text-base font-black text-gray-800">{asset.condition}</p>
                </div>
              </div>

              {/* Site & Operator */}
              <div className="border-t border-gray-100 px-5 py-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="font-semibold">{asset.site}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{asset.operator ?? "No operator assigned"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{asset.location}</span>
                </div>
              </div>
            </div>

            {/* Status gate */}
            {asset.status !== "available" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-semibold">
                ⚠️ This machine is currently <strong>{statusLabel(asset.status)}</strong> and cannot be checked out again.
              </div>
            ) : (
              <button
                onClick={() => setStep("form")}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#FFCD11] py-4 text-base font-black text-[#181818] shadow-md active:scale-[0.97] transition-transform"
              >
                <ArrowUpFromLine className="h-5 w-5" />
                Proceed to Checkout
              </button>
            )}
          </div>
        )}

        {/* CHECKOUT FORM */}
        {(step === "form" || step === "submitting") && asset && (
          <form onSubmit={handleCheckout} className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-[#FFCD11]/40 bg-[#FFCD11]/10 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#181818] text-[10px] font-black text-[#FFCD11]">
                {asset.category.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-black text-gray-900">{asset.name}</p>
                <p className="text-xs text-gray-500">{asset.id} · {asset.serialNumber}</p>
              </div>
            </div>

            {/* Site */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Site *</label>
              <select
                value={siteId}
                onChange={e => setSiteId(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none focus:border-[#FFCD11] focus:ring-2 focus:ring-[#FFCD11]/30"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Operator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700">Operator</label>
                <button
                  type="button"
                  onClick={() => { setNewOperatorMode(v => !v); setNewOperatorName(""); }}
                  className="text-[11px] font-bold text-[#8a5a00] hover:underline"
                >
                  {newOperatorMode ? "← Use existing" : "+ New operator"}
                </button>
              </div>
              {newOperatorMode ? (
                <div className="space-y-2 rounded-xl border border-[#FFCD11]/30 bg-[#FFCD11]/5 p-3">
                  <input
                    type="text"
                    placeholder="Full name *"
                    value={newOperatorName}
                    onChange={e => setNewOperatorName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#FFCD11]"
                  />
                  <p className="text-[11px] text-gray-400">Logged against this checkout record.</p>
                </div>
              ) : (
                <select
                  value={operatorId}
                  onChange={e => setOperatorId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800 outline-none focus:border-[#FFCD11] focus:ring-2 focus:ring-[#FFCD11]/30"
                >
                  {operators.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Deployment Location *</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Zone 2 · North workface"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm outline-none focus:border-[#FFCD11] focus:ring-2 focus:ring-[#FFCD11]/30"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={step === "submitting"}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#181818] py-4 text-base font-black text-[#FFCD11] shadow-md disabled:opacity-60 active:scale-[0.97] transition-transform"
            >
              {step === "submitting" ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
              ) : (
                <><ArrowUpFromLine className="h-5 w-5" /> Confirm Checkout</>
              )}
            </button>
          </form>
        )}

        {/* SUCCESS */}
        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
            <div className="rounded-full bg-emerald-100 p-5">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">Checkout Complete!</p>
              <p className="mt-2 text-sm text-gray-500">{successMsg}</p>
            </div>
            <p className="text-xs text-gray-400 bg-gray-100 rounded-xl px-4 py-2">
              This rental has been logged in the CTRL+CAT Fleet Management System.
            </p>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white px-5 py-3 text-center">
        <p className="text-[11px] text-gray-400 font-medium">CTRL+CAT Fleet Management · Powered by Caterpillar Dealer Network</p>
      </div>
    </div>
  );
}
