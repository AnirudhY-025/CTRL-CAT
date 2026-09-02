"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, QrCode } from "lucide-react";

interface AssetQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  serialNumber: string;
}

export function AssetQrDialog({
  open,
  onOpenChange,
  assetId,
  assetName,
  serialNumber,
}: AssetQrDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // The URL encoded in the QR — scanning opens the mobile checkout page
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkoutUrl = `${baseUrl}/checkout/${assetId}`;

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank", "width=500,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>QR Tag — ${assetName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, sans-serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .tag { border: 2px solid #181818; border-radius: 16px; padding: 24px; width: 300px; text-align: center; }
            .brand { font-size: 10px; font-weight: 900; letter-spacing: .12em; color: #8a5a00; text-transform: uppercase; margin-bottom: 4px; }
            .name { font-size: 18px; font-weight: 900; color: #181818; margin-bottom: 2px; }
            .meta { font-size: 10px; color: #888; margin-bottom: 16px; }
            svg { display: block; margin: 0 auto; }
            .url { font-size: 9px; color: #aaa; margin-top: 12px; word-break: break-all; }
            .id-badge { display: inline-block; background: #181818; color: #FFCD11; font-size: 11px; font-weight: 900; letter-spacing: .08em; padding: 4px 10px; border-radius: 6px; margin-top: 10px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="brand">CTRL+CAT Fleet Management</div>
            <div class="name">${assetName}</div>
            <div class="meta">S/N: ${serialNumber}</div>
            ${printContent.innerHTML}
            <div class="id-badge">${assetId}</div>
            <div class="url">${checkoutUrl}</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  function handleDownload() {
    const svg = printRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-${assetId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Asset QR Tag
          </DialogTitle>
          <DialogDescription>
            Print or download this QR tag and attach it to the machine. Scanning opens the mobile checkout form instantly.
          </DialogDescription>
        </DialogHeader>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="rounded-2xl border-2 border-border/80 bg-white p-5 flex flex-col items-center gap-3">
            <p className="text-[10px] font-bold tracking-widest text-[#8a5a00] uppercase">CTRL+CAT Fleet Management</p>
            <p className="text-base font-black text-gray-900">{assetName}</p>
            <p className="text-[11px] text-gray-400">S/N: {serialNumber}</p>
            <div ref={printRef}>
              <QRCodeSVG
                value={checkoutUrl}
                size={192}
                bgColor="#ffffff"
                fgColor="#181818"
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="rounded-lg bg-[#181818] px-3 py-1 text-xs font-black tracking-wider text-[#FFCD11]">
              {assetId}
            </div>
          </div>

          <p className="text-center text-[11px] text-muted-foreground break-all px-2">
            {checkoutUrl}
          </p>

          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-1.5 text-xs"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              Download SVG
            </Button>
            <Button
              type="button"
              className="flex-1 gap-1.5 text-xs font-bold"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              Print Tag
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
