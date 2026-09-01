"use client";

import React, { useState, useEffect } from "react";
import { useZxing } from "react-zxing";
import { Camera, X, QrCode, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (text: string) => void;
}

const extractAssetId = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.includes("/") || trimmed.includes("?")) {
    const parts = trimmed.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1];
    return lastPart ? lastPart.split("?")[0] : trimmed;
  }
  return trimmed;
};

function InnerCameraStream({
  onSuccess,
  setError,
}: {
  onSuccess: (code: string) => void;
  setError: (err: string | null) => void;
}) {
  const { ref } = useZxing({
    constraints: {
      video: { facingMode: "environment" },
    },
    onDecodeResult(result: any) {
      const text = typeof result?.getText === "function" ? result.getText() : result?.rawValue || String(result || "");
      if (text) {
        onSuccess(text);
      }
    },
    onError(err: any) {
      console.warn("QR Scanner notice/error:", err);
      if (err?.name === "NotAllowedError" || err?.message?.includes("Permission denied")) {
        setError("Camera permission denied. Please allow camera access in browser settings.");
      } else if (err?.name === "NotFoundError" || err?.message?.includes("DevicesNotFoundError")) {
        setError("No camera device found on this device.");
      } else if (err?.name === "NotReadableError") {
        setError("Camera is currently in use by another app.");
      }
    },
  });

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      playsInline
      muted
    />
  );
}

export function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isSecureContext, setIsSecureContext] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const isHttps = window.location.protocol === "https:";
      if (!isLocalhost && !isHttps) {
        setIsSecureContext(false);
      }
    }
  }, []);

  const handleSuccess = (code: string) => {
    const extracted = extractAssetId(code);
    onScan(extracted);
    onOpenChange(false);
    setError(null);
    setManualCode("");
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccess(manualCode.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Scan Asset QR Code
          </DialogTitle>
          <DialogDescription>
            Scan machine QR tag or enter equipment ID below for immediate checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Container */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-border/80 bg-slate-950 flex flex-col items-center justify-center">
            {open && (
              <InnerCameraStream
                onSuccess={handleSuccess}
                setError={setError}
              />
            )}

            {!isSecureContext && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 p-6 text-center">
                <div className="mb-2 rounded-full bg-amber-500/10 p-3 text-amber-500">
                  <Camera className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">Camera requires HTTPS or Localhost</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Browsers block camera permissions over HTTP IP addresses. Use localhost, HTTPS, or manual entry below.
                </p>
              </div>
            )}

            {error && isSecureContext && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 p-6 text-center">
                <div className="mb-2 rounded-full bg-destructive/10 p-3 text-destructive">
                  <X className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setError(null)}
                >
                  Retry Camera
                </Button>
              </div>
            )}

            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              {/* Viewfinder crosshairs */}
              <div className="h-44 w-44 border-2 border-primary/60 rounded-xl relative shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary rounded-tl-lg -translate-x-1.5 -translate-y-1.5" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary rounded-tr-lg translate-x-1.5 -translate-y-1.5" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary rounded-bl-lg -translate-x-1.5 translate-y-1.5" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary rounded-br-lg translate-x-1.5 translate-y-1.5" />
              </div>
            </div>
          </div>

          {/* Manual Entry & Quick Simulate fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="Or type Asset ID (e.g. EQX1001)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="text-xs"
            />
            <Button type="submit" size="sm" variant="secondary" className="shrink-0 text-xs font-semibold">
              Checkout
            </Button>
          </form>

          <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1 border-t">
            <span>Quick Demo Test:</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleSuccess("EQX1001")}
                className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
              >
                <Sparkles className="h-3 w-3" /> EQX1001 (Sobha)
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => handleSuccess("EQX1002")}
                className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
              >
                EQX1002
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
