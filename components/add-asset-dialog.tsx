"use client";

import * as React from "react";
import { Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createEquipment } from "@/lib/api";
import { Asset, Condition } from "@/lib/types";

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssetAdded?: (asset: Asset) => void;
}

const EQUIPMENT_TYPES = [
  "Excavator",
  "Bulldozer",
  "Wheel Loader",
  "Motor Grader",
  "Backhoe Loader",
  "Skid Steer",
  "Compactor",
  "Dump Truck",
  "Telehandler",
];

export function AddAssetDialog({
  open,
  onOpenChange,
  onAssetAdded,
}: AddAssetDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const [equipmentId, setEquipmentId] = React.useState("");
  const [equipmentType, setEquipmentType] = React.useState("Excavator");
  const [displayName, setDisplayName] = React.useState("");
  const [serialNumber, setSerialNumber] = React.useState("");
  const [location, setLocation] = React.useState("Main Yard");
  const [condition, setCondition] = React.useState<Condition>("Good");
  const [ageYears, setAgeYears] = React.useState("2");
  const [engineHours, setEngineHours] = React.useState("120");
  const [idleHours, setIdleHours] = React.useState("18");
  const [fuelLevel, setFuelLevel] = React.useState("100");

  const resetForm = () => {
    setEquipmentId("");
    setEquipmentType("Excavator");
    setDisplayName("");
    setSerialNumber("");
    setLocation("Main Yard");
    setCondition("Good");
    setAgeYears("2");
    setEngineHours("120");
    setIdleHours("18");
    setFuelLevel("100");
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentId.trim()) {
      setError("Asset ID is required (e.g. EQX-1020)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formattedId = equipmentId.trim().toUpperCase();
      const res = await createEquipment({
        equipment_id: formattedId,
        equipment_type: equipmentType,
        display_name: displayName.trim() || `CAT ${equipmentType} ${formattedId}`,
        serial_number: serialNumber.trim() || `SN-${formattedId}`,
        location: location.trim() || "Main Yard",
        condition: condition,
        age_years: Number(ageYears) || 1,
        engine_hours: Number(engineHours) || 0,
        idle_hours: Number(idleHours) || 0,
        fuel_level: Number(fuelLevel) || 100,
      });

      setSuccess(true);
      if (res.asset && onAssetAdded) {
        onAssetAdded(res.asset);
      }

      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Failed to add asset to database");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) resetForm();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Add New Heavy Equipment</DialogTitle>
              <DialogDescription>
                Register a new CAT machine directly into inventory & database.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Asset Registered!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Machine is saved to database and ready for check-out and QR tagging.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6 pt-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Asset / Equipment ID *
                </label>
                <Input
                  required
                  placeholder="e.g. EQX1025 or CAT-320-04"
                  value={equipmentId}
                  onChange={(e) => setEquipmentId(e.target.value)}
                  className="font-mono uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Equipment Type *
                </label>
                <select
                  value={equipmentType}
                  onChange={(e) => setEquipmentType(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {EQUIPMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                Display Name / Model (Optional)
              </label>
              <Input
                placeholder="e.g. CAT 320 Next Gen Hydraulic Excavator"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Serial Number
                </label>
                <Input
                  placeholder="e.g. CAT00320VDK892"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Initial Location
                </label>
                <Input
                  placeholder="e.g. Main Yard or North Depot"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as Condition)}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-2.5 py-2 text-xs font-bold text-foreground shadow-sm focus:border-primary focus:outline-none"
                >
                  <option value="Good">Good</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Service due">Service due</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Age (Years)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  value={ageYears}
                  onChange={(e) => setAgeYears(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Engine Hours
                </label>
                <Input
                  type="number"
                  min="0"
                  value={engineHours}
                  onChange={(e) => setEngineHours(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Fuel Level (%)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={loading}
                className="gap-2 font-bold px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Equipment
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
