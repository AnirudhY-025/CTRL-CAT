import { NextResponse } from "next/server";
import { Resend } from "resend";

import type { AlertResponse } from "@/lib/types";

// Uses Resend (https://resend.com)
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? "CTRL+CAT Operations <onboarding@resend.dev>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type DealerAlertType =
  | "temp_surge"
  | "sudden_damage"
  | "low_fuel"
  | "idle_overrun"
  | "anomaly"
  | "maintenance";

interface AlertRequestBody {
  toEmail: string;
  managerName?: string;
  customerCompany?: string;
  assetId?: string;
  assetName?: string;
  siteName?: string;
  alertType?: DealerAlertType;
  detail?: string;
  customSubject?: string;
  customBody?: string;
}

function buildDealerEmailHtml(data: AlertRequestBody): { subject: string; html: string } {
  const customer = data.customerCompany ?? "Valued Partner";
  const manager = data.managerName ?? "Site Operations Lead";
  const asset = data.assetName ?? "Rented Equipment";
  const assetId = data.assetId ?? "CAT-UNKNOWN";
  const site = data.siteName ?? "Job Site";
  const type = data.alertType ?? "anomaly";

  if (data.customBody) {
    const subject = data.customSubject ?? `[Rental Notice] Message Regarding Rented Equipment (${assetId})`;
    return {
      subject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f4f4f0;padding:24px;margin:0;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e2dc;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
    <div style="background:#181818;padding:20px 24px;display:flex;align-items:center;justify-content:between;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="background:#FFCD11;color:#181818;font-weight:900;padding:6px 12px;border-radius:6px;font-size:14px;letter-spacing:0.05em;">CTRL+CAT</span>
        <span style="color:#ffffff;font-weight:700;font-size:15px;margin-left:8px;">Dealer Operations Dispatch</span>
      </div>
    </div>
    <div style="padding:28px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.06em;color:#8a5a00;text-transform:uppercase;">Rental Communications · ${customer}</p>
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#181818;">${data.customSubject ?? "Equipment Notification"}</h2>
      <div style="font-size:14px;color:#333333;line-height:1.7;white-space:pre-wrap;background:#f9f9f6;padding:18px;border-radius:8px;border:1px solid #e8e8e2;">
${data.customBody}
      </div>
      <p style="margin-top:20px;font-size:12px;color:#777777;">
        Sent to: <strong>${data.toEmail}</strong> (${manager}) · Site: <strong>${site}</strong>
      </p>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eeeeea;background:#fafaf8;font-size:11px;color:#888888;display:flex;justify-content:space-between;">
      <span>CTRL+CAT Equipment Rental Dealership · 24/7 Operations Desk</span>
    </div>
  </div>
</body>
</html>
`,
    };
  }

  // Preset templates by dealer alert type
  switch (type) {
    case "temp_surge":
      return {
        subject: `🚨 [URGENT DEALERSHIP ALERT] Thermal Surge Detected — ${asset} (${assetId}) at ${site}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f4ef;padding:24px;margin:0;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e2dc;">
    <div style="background:#b91c1c;padding:18px 24px;">
      <span style="background:#ffffff;color:#b91c1c;font-weight:900;padding:4px 8px;border-radius:4px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">CRITICAL TELEMETRY WARNING</span>
      <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:800;">High Temperature Surge Warning</h1>
    </div>
    <div style="padding:24px;">
      <p style="font-size:14px;color:#333;line-height:1.6;margin-top:0;">
        Dear <strong>${manager}</strong> (${customer}),<br/>
        Our dealership live telemetry sensors have detected a <strong>critical temperature spike</strong> in the engine / hydraulic system of your rented machine.
      </p>
      <div style="background:#fef2f2;border-left:4px solid #b91c1c;padding:14px;border-radius:6px;margin:16px 0;">
        <table style="width:100%;font-size:13px;">
          <tr><td style="color:#666;padding:4px 0;width:120px;"><strong>Machine:</strong></td><td style="color:#111;">${asset} (${assetId})</td></tr>
          <tr><td style="color:#666;padding:4px 0;"><strong>Job Site:</strong></td><td style="color:#111;">${site}</td></tr>
          <tr><td style="color:#666;padding:4px 0;"><strong>Telemetry Alert:</strong></td><td style="color:#b91c1c;font-weight:700;">${data.detail ?? "Engine coolant / hydraulic oil temperature exceeded 108°C safe threshold."}</td></tr>
        </table>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px;margin-bottom:20px;">
        <h3 style="margin:0 0 6px;color:#92400e;font-size:13px;font-weight:800;text-transform:uppercase;">⚠️ Immediate Dealer Action Required:</h3>
        <ol style="margin:0;padding-left:18px;font-size:13px;color:#78350f;line-height:1.6;">
          <li>Instruct your on-site operator to idle down and safely power off the engine immediately.</li>
          <li>Check coolant reservoir and clear radiator debris if safe to do so.</li>
          <li>Do not restart under full load until our dealer field service technician inspects the cooling lines.</li>
        </ol>
      </div>
      <p style="font-size:12px;color:#777;margin:0;">
        For urgent on-site technician dispatch, contact our Dealer Support Hotline at <strong>1800-CAT-RENT</strong>.
      </p>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eeeeea;background:#fafaf8;font-size:11px;color:#888;">
      CTRL+CAT Equipment Fleet Management · Sent on behalf of your Equipment Dealer
    </div>
  </div>
</body>
</html>
`,
      };

    case "sudden_damage":
      return {
        subject: `⚠️ [INCIDENT ALERT] Sudden Impact / Sensor Trigger — ${asset} (${assetId}) at ${site}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f4ef;padding:24px;margin:0;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e2dc;">
    <div style="background:#ea580c;padding:18px 24px;">
      <span style="background:#ffffff;color:#ea580c;font-weight:900;padding:4px 8px;border-radius:4px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">MACHINE INCIDENT REPORT</span>
      <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:800;">Sudden Shock / Damage Alert</h1>
    </div>
    <div style="padding:24px;">
      <p style="font-size:14px;color:#333;line-height:1.6;margin-top:0;">
        Dear <strong>${manager}</strong> (${customer}),<br/>
        An abnormal physical impact or diagnostic trouble code (DTC warning) has been registered on your rented machine at <strong>${site}</strong>.
      </p>
      <div style="background:#fff7ed;border-left:4px solid #ea580c;padding:14px;border-radius:6px;margin:16px 0;">
        <table style="width:100%;font-size:13px;">
          <tr><td style="color:#666;padding:4px 0;width:120px;"><strong>Machine:</strong></td><td style="color:#111;">${asset} (${assetId})</td></tr>
          <tr><td style="color:#666;padding:4px 0;"><strong>Location:</strong></td><td style="color:#111;">${site}</td></tr>
          <tr><td style="color:#666;padding:4px 0;"><strong>Incident Detail:</strong></td><td style="color:#c2410c;font-weight:700;">${data.detail ?? "Excessive G-force impact / tilt anomaly registered on chassis telemetry."}</td></tr>
        </table>
      </div>
      <div style="background:#f4f4f0;border-radius:8px;padding:14px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#444;line-height:1.6;">
          <strong>Next Steps:</strong> Please conduct a visual safety inspection of the bucket, undercarriage, and hydraulic hoses before resuming operation to avoid structural damage penalties.
        </p>
      </div>
      <p style="font-size:12px;color:#777;margin:0;">
        Please log an incident report or reply to this email with photos if repairs are needed.
      </p>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eeeeea;background:#fafaf8;font-size:11px;color:#888;">
      CTRL+CAT Equipment Fleet Management · Dealer Telemetry Dispatch
    </div>
  </div>
</body>
</html>
`,
      };

    case "low_fuel":
      return {
        subject: `⛽ [FUEL ADVISORY] Critical Low Fuel Warning — ${asset} (${assetId})`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f4ef;padding:24px;margin:0;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e2dc;">
    <div style="background:#d97706;padding:18px 24px;">
      <span style="background:#ffffff;color:#d97706;font-weight:900;padding:4px 8px;border-radius:4px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;">OPERATIONAL ADVISORY</span>
      <h1 style="color:#ffffff;font-size:20px;margin:8px 0 0;font-weight:800;">Critical Low Fuel Level Warning</h1>
    </div>
    <div style="padding:24px;">
      <p style="font-size:14px;color:#333;line-height:1.6;margin-top:0;">
        Dear <strong>${manager}</strong> (${customer}),<br/>
        Telemetry indicates that <strong>${asset} (${assetId})</strong> at <strong>${site}</strong> is operating with fuel levels below 15%.
      </p>
      <div style="background:#fffbeb;border-left:4px solid #d97706;padding:14px;border-radius:6px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">
          ${data.detail ?? "Current tank capacity estimated under 2 operating hours remaining."}
        </p>
      </div>
      <p style="font-size:13px;color:#555;line-height:1.6;">
        To prevent air locks in the diesel injection system and avoid unexpected jobsite stoppage, please arrange refuelling before the next work cycle.
      </p>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eeeeea;background:#fafaf8;font-size:11px;color:#888;">
      CTRL+CAT Equipment Fleet Management · Dealer Telemetry Dispatch
    </div>
  </div>
</body>
</html>
`,
      };

    default: // Anomaly / Predictive Maintenance / Overuse
      return {
        subject: `⚠️ [DEALER FLEET CARE] Telemetry Anomaly Detected — ${asset} (${assetId}) at ${site}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f4ef;padding:24px;margin:0;">
  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e2dc;">
    <div style="background:#181818;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;">
      <div>
        <span style="background:#FFCD11;color:#181818;font-weight:900;padding:4px 8px;border-radius:4px;font-size:11px;letter-spacing:0.08em;">DEALER FLEET CARE</span>
        <h1 style="color:#ffffff;font-size:18px;margin:8px 0 0;font-weight:800;">Equipment Telemetry Advisory</h1>
      </div>
    </div>
    <div style="padding:24px;">
      <p style="font-size:14px;color:#333;line-height:1.6;margin-top:0;">
        Dear <strong>${manager}</strong> (${customer}),<br/>
        Our dealer monitoring system has flagged an operational anomaly for your rented asset at <strong>${site}</strong>.
      </p>
      <div style="background:#f9f9f6;border:1px solid #e5e5dc;border-radius:8px;padding:16px;margin:16px 0;">
        <table style="width:100%;font-size:13px;">
          <tr><td style="color:#777;padding:4px 0;width:120px;"><strong>Asset:</strong></td><td style="color:#181818;font-weight:600;">${asset}</td></tr>
          <tr><td style="color:#777;padding:4px 0;"><strong>Serial / ID:</strong></td><td style="color:#181818;">${assetId}</td></tr>
          <tr><td style="color:#777;padding:4px 0;"><strong>Site Location:</strong></td><td style="color:#181818;">${site}</td></tr>
          <tr><td style="color:#777;padding:4px 0;"><strong>Observation:</strong></td><td style="color:#8a5a00;font-weight:700;">${data.detail ?? "Abnormal fuel burn vs. engine load pattern detected in rolling 3-day telemetry."}</td></tr>
        </table>
      </div>
      <p style="font-size:13px;color:#555;line-height:1.6;">
        Our team recommends reviewing operator idling habits and verifying fluid levels to maintain machine longevity and prevent project downtime.
      </p>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eeeeea;background:#fafaf8;font-size:11px;color:#888;">
      CTRL+CAT Equipment Dealership Operations Desk
    </div>
  </div>
</body>
</html>
`,
      };
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as AlertRequestBody;

  if (!RESEND_API_KEY) {
    return NextResponse.json<AlertResponse>(
      { success: false, message: "RESEND_API_KEY not configured" },
      { status: 503 },
    );
  }

  const { subject, html } = buildDealerEmailHtml(body);

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [body.toEmail],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json<AlertResponse>(
        { success: false, message: error.message || "Failed to send email via Resend" },
        { status: 502 },
      );
    }

    return NextResponse.json<AlertResponse>({
      success: true,
      message: `Dealer alert dispatched to ${body.toEmail}`,
    });
  } catch (err: any) {
    console.error("Resend error:", err);
    return NextResponse.json<AlertResponse>(
      { success: false, message: err?.message || "Failed to send email via dealer gateway" },
      { status: 502 },
    );
  }
}
