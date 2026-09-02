import { NextResponse } from "next/server";
import type { AlertResponse } from "@/lib/types";

/**
 * Vapi AI Outbound Call
 * Docs: https://docs.vapi.ai/api-reference/calls/create
 *
 * Required env vars in .env.local:
 *   VAPI_API_KEY          — Private API Key from Vapi Dashboard (Account -> API Keys)
 *   VAPI_PHONE_NUMBER_ID  — Phone Number ID from Vapi (Phone Numbers tab)
 *   VAPI_ASSISTANT_ID     — (Optional) Assistant ID from Vapi (Assistants tab)
 */

const VAPI_API_KEY = process.env.VAPI_API_KEY ?? "";
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID ?? "";
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID ?? "";
const VAPI_ENDPOINT = "https://api.vapi.ai/call";

export type VoiceScenario = "emergency_alert" | "rental_extension" | "operator_diagnostic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    phoneNumber: string;
    assetId?: string;
    assetName?: string;
    siteName?: string;
    customerName?: string;
    operatorName?: string;
    riskDescription?: string;
    errorCode?: string;
    scenario?: VoiceScenario;
  };

  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID) {
    return NextResponse.json<AlertResponse>(
      {
        success: false,
        message: "VAPI_API_KEY or VAPI_PHONE_NUMBER_ID not configured in .env.local",
      },
      { status: 503 },
    );
  }

  const scenario = body.scenario ?? "emergency_alert";
  const customer = body.customerName ?? "Valued Client";
  const asset = body.assetName ?? "Caterpillar Machine";
  const assetId = body.assetId ?? "CAT-FLEET";
  const site = body.siteName ?? "Job Site";

  let firstMessage = "";
  let systemPrompt = "";

  if (scenario === "rental_extension") {
    firstMessage = `Hello, this is Sarah from the CTRL+CAT Equipment Dealership rental desk. Am I speaking with the operations manager for ${customer}?`;
    systemPrompt = `You are Sarah, an AI Rental Account Manager for the CTRL+CAT Equipment Dealership.
Your goal is to call the customer (${customer}) regarding their rented ${asset} (ID: ${assetId}) at ${site}, which is nearing the end of its rental period.

Key Objectives:
1. Remind the manager that the current rental term expires soon.
2. Ask if they would like to extend the rental by another week at their contracted preferred daily rate.
3. If they say YES to extend: Confirm the extension dates, thank them, and mention you'll email the updated rental agreement.
4. If they say NO: Ask if they want a flatbed transporter scheduled for equipment pickup tomorrow morning.
5. Keep your responses concise, friendly, professional, and under 2 sentences.`;
  } else if (scenario === "operator_diagnostic") {
    firstMessage = `Hello, this is the 24/7 Cat Telematics Diagnostic AI Hotline. I have received an inquiry regarding ${asset} (${assetId}) at ${site}. What error code or mechanical symptom are you experiencing?`;
    systemPrompt = `You are a Senior Caterpillar Certified Master Diagnostic AI for the CTRL+CAT 24/7 Dealer Support Hotline.
You are assisting on-site equipment operators and technicians.

Machine in question: ${asset} (ID: ${assetId}) at ${site}.
Diagnostic context: ${body.errorCode ?? "Operator requested diagnostic check"}.

Guidelines:
1. Explain the diagnostic error code or symptom clearly in plain mechanical terms.
2. Tell the operator whether it is safe to continue operating under light load or if they MUST power down immediately.
3. If severe (e.g., thermal spike > 110°C, low hydraulic pressure, DTC 102-3 turbo boost, or fluid contaminated), advise immediate shutdown to avoid component seizure.
4. Offer to dispatch a certified mobile field technician to their job site GPS location.
5. Keep your tone knowledgeable, calm, and reassuring.`;
  } else {
    // Default emergency alert
    firstMessage = `Hello, this is an urgent safety alert from the CTRL+CAT Dealership Operations Desk for the operations lead at ${site}. We have detected an immediate telemetry warning on ${asset}.`;
    systemPrompt = `You are Sarah, an automated emergency dispatch assistant from the CTRL+CAT Caterpillar Dealership Operations Center.
You are placing an urgent call regarding critical live telemetry on ${asset} (${assetId}) at ${site}.

Issue details: ${body.riskDescription ?? "Critical engine / hydraulic telemetry alarm"}.

Instructions:
1. Deliver the alert clearly: machine name, site, and specific hazard.
2. Instruct the lead to have the operator idle down and safely power off the machine to prevent permanent damage.
3. Offer to dispatch an emergency Cat Certified Dealer Field Technician.
4. Confirm acknowledgment, thank them for prioritizing jobsite safety, and conclude the call.`;
  }

  const vapiPayload: Record<string, unknown> = {
    phoneNumberId: VAPI_PHONE_NUMBER_ID,
    customer: {
      number: body.phoneNumber,
      name: body.operatorName ?? body.customerName ?? "Site Manager",
    },
    metadata: {
      assetId,
      siteName: site,
      scenario,
      source: "ctrl-cat-dealership",
    },
  };

  // If user configured VAPI_ASSISTANT_ID, use it directly with overrides
  if (VAPI_ASSISTANT_ID) {
    vapiPayload.assistantId = VAPI_ASSISTANT_ID;
    vapiPayload.assistantOverrides = {
      firstMessage,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
        ],
      },
    };
  } else {
    // Fallback to full inline assistant configuration
    vapiPayload.assistant = {
      name: "CTRL+CAT Dealer AI Voice Agent",
      firstMessage,
      model: {
        provider: "openai",
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
        ],
      },
      voice: {
        provider: "11labs",
        voiceId: "21m00Tcm4TlvDq8ikWAM", // "Rachel"
      },
      endCallFunctionEnabled: true,
      endCallPhrases: ["goodbye", "thank you", "got it", "understood", "will do", "confirmed", "have a good day"],
      maxDurationSeconds: 180,
    };
  }

  const response = await fetch(VAPI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VAPI_API_KEY}`,
    },
    body: JSON.stringify(vapiPayload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Vapi error:", error);
    return NextResponse.json<AlertResponse>(
      { success: false, message: "Failed to dispatch AI voice call" },
      { status: 502 },
    );
  }

  return NextResponse.json<AlertResponse>({
    success: true,
    message: `AI Voice Call (${scenario}) dispatched to ${body.phoneNumber}`,
  });
}
