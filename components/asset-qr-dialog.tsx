"use client";

import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AssetQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  serialNumber?: string;
}

export function AssetQrDialog({
  open,
  onOpenChange,
  assetId,
  assetName,
  serialNumber,
}: AssetQrDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkoutUrl = `${baseUrl}/checkout/${assetId}`;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset QR Tag - ${assetId}</title>
          <style>
            @page {
              size: 4in 3in;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 16px;
              background: #fff;
              color: #111;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .card {
              border: 3px solid #111;
              border-radius: 12px;
              padding: 14px 18px;
              text-align: center;
              width: 100%;
              max-width: 340px;
              box-sizing: border-box;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #FFCD11;
              padding-bottom: 6px;
              margin-bottom: 10px;
            }
            .brand {
              font-size: 14px;
              font-weight: 900;
              letter-spacing: 1px;
            }
            .brand-badge {
              background: #FFCD11;
              color: #111;
              font-weight: 900;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 4px;
            }
            .qr-wrap {
              display: inline-block;
              padding: 8px;
              background: #fff;
              border: 2px solid #eee;
              border-radius: 8px;
              margin: 6px 0;
            }
            .asset-id {
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 1px;
              margin: 4px 0 2px;
            }
            .asset-name {
              font-size: 11px;
              color: #555;
              margin-bottom: 4px;
            }
            .footer {
              font-size: 8px;
              color: #888;
              margin-top: 6px;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Equipment QR Tag</DialogTitle>
              <DialogDescription>
                Scan with phone camera to instantly check in/out.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <div ref={printRef} className="w-full flex justify-center">
            <div className="card rounded-2xl border-2 border-border/80 bg-muted/30 p-5 text-center shadow-sm w-full max-w-[280px]">
              <div className="header flex items-center justify-between border-b-2 border-primary pb-2 mb-3">
                <span className="brand font-black text-xs tracking-wider text-foreground">
                  CTRL+CAT
                </span>
                <span className="brand-badge bg-primary text-primary-foreground font-black text-[9px] px-2 py-0.5 rounded">
                  OFFICIAL TAG
                </span>
              </div>

              <div className="qr-wrap inline-block p-3 bg-white rounded-xl shadow-inner border border-border/40">
                <QRCodeSVG
                  value={checkoutUrl}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <p className="asset-id font-mono text-xl font-black tracking-tight text-foreground mt-2">
                {assetId}
              </p>
              <p className="asset-name text-xs text-muted-foreground line-clamp-1">
                {assetName}
              </p>
              {serialNumber && (
                <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
                  S/N: {serialNumber}
                </p>
              )}

              <p className="footer text-[9px] text-muted-foreground/60 mt-3 pt-2 border-t border-border/40">
                Scan with standard phone camera
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-2 font-bold shadow-sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4" />
            Print Tag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
