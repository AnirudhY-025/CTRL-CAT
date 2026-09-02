# 🚜 CTRL+CAT — Caterpillar Fleet Management & AI Telematics System

**CTRL+CAT** is an enterprise-grade Caterpillar Heavy Equipment Rental Management & Telematics Operations platform. Designed for both desktop dealership control rooms and mobile field dealers, CTRL+CAT combines real-time IoT machine telemetry, interactive GIS route tracking, mobile QR code checkout flows, predictive machine learning diagnostics, and automated AI voice/email emergency dispatching.

---

## 📐 System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|   +-------------------------------------+   +---------------------------------+   |
|   |   Desktop Operations Control Room   |   |   Mobile Dealer QR Checkout     |   |
|   |  (Dashboard, Live Map, Telemetry)   |   |  (Device Camera via react-zxing)|   |
|   +----------------------------------+--+   +---------------------------------+   |
+--------------------------------------|--------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                         NEXT.JS 15 FULLSTACK APPLICATION                          |
|                               (Deployed on Vercel)                                |
|                                                                                   |
|  +---------------------------+   +--------------------+   +--------------------+  |
|  | Components Layer          |   | Route Handlers     |   | Leaflet Map Canvas |  |
|  | - RentalDashboard         |   | - /api/rentals     |   | - OpenStreetMap    |  |
|  | - SitesView               |   | - /api/equipment   |   | - Polyline Routes  |  |
|  | - QrScannerDialog         |   | - /api/sites       |   | - Live GPS Loop    |  |
|  +---------------------------+   +--------------------+   +--------------------+  |
+-------------------v-----------------------v-------------------------v-------------+
                    |                       |                         |
                    v                       v                         v
+-----------------------+     +------------------------+    +-----------------------+
|  DATABASE & STORAGE   |     |    COMMUNICATION AI    |    |  PYTHON ML SERVICE    |
|                       |     |                        |    |                       |
|   Neon PostgreSQL     |     |  Vapi AI Voice Agent   |    |  FastAPI Analytics    |
|  - Equipment Tables   |     |  (Outbound Telematics) |    |  - Demand Forecast    |
|  - Rentals & Sites    |     |                        |    |  - Telemetry Anomaly  |
|  - Operator History   |     |  Resend Email Gateway  |    |    Detection          |
|                       |     |  (Incident Alerts)     |    |                       |
+-----------------------+     +------------------------+    +-----------------------+
```

### Architecture Sequence & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Dealer as Field Dealer / Operator
    participant App as Next.js Web App (Vercel)
    participant DB as Neon Postgres DB
    participant Vapi as Vapi AI Voice Agent
    participant Resend as Resend Email Gateway
    participant ML as FastAPI ML Service

    Note over Dealer, App: 1. Equipment Checkout via Mobile QR
    Dealer->>App: Scan Machine QR Tag / Enter ID
    App->>DB: Query Equipment Availability
    DB-->>App: Return Asset Details
    Dealer->>App: Select Customer & Site -> Submit
    App->>DB: Record Rental Checkout (POST /api/rentals/checkout)
    DB-->>App: Updated Rental Manifest
    App-->>Dealer: UI updates Customer Rental Count instantly

    Note over Dealer, App: 2. Emergency Telemetry Surge & Dispatch
    App->>App: Telemetry Monitor detects Critical Coolant Surge / Tilt
    App->>Vapi: Trigger Outbound Voice Alert (POST /api/alerts/voice)
    Vapi-->>Dealer: Phone rings: AI Assistant "Nikil" speaks emergency warnings
    App->>Resend: Dispatch HTML Incident Report (POST /api/alerts/email)
    Resend-->>Dealer: Delivery of Machine Incident Report to Manager

    Note over App, ML: 3. Predictive Analytics & GIS Tracking
    App->>ML: Fetch Predictive Demand & Anomaly Risk
    ML-->>App: Return Forecast & Utilization Models
    App->>App: Render OpenStreetMap Polyline Routes & Dynamic HUD
```

---

## 🌟 Key Features

1. **📱 Mobile Camera QR Scanner Checkout**:
   - Built with `react-zxing` and native browser WebRTC media streams.
   - Instantly extracts machine serials / asset IDs from QR tags or URL links.
   - Automatically pre-fills checkout forms and updates customer active fleet counts in real time.

2. **🗺️ Interactive GIS Route Tracking (OpenStreetMap)**:
   - Dynamic Leaflet canvas displaying active equipment and vehicles in transit around job sites.
   - Polylines visualize completed travel paths (emerald green) vs remaining route distance (dashed amber).
   - Dynamic map auto-zooming and live telemetry HUD (ETA, speed, progress).

3. **📞 24/7 Vapi AI Voice Telematics Dispatcher**:
   - Outbound automated phone dispatch calls using Vapi AI voice models (`gpt-4o-mini` + custom system prompts).
   - Handles multi-lingual emergency alarms, operator diagnostic hotline support, and rental extension reminders.

4. **✉️ Automated Resend Email Incident Reports**:
   - Generates and emails styled HTML incident reports directly to site operations leads upon telemetry spikes.

5. **🤖 Python ML Predictive Analytics**:
   - Integrates with a FastAPI machine learning service for 7-day equipment demand forecasting and telemetry anomaly detection.

6. **💾 Serverless Postgres Database**:
   - Powered by Neon PostgreSQL for high-availability cloud database storage.

---

## 🚀 Deployment Guide (Vercel)

The frontend Next.js application is configured for seamless deployment on **Vercel**.

### Step 1: Environment Variables on Vercel
In your Vercel Project Settings under **Environment Variables**, add the following:

| Variable Name | Description | Example / Required Value |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL Connection String | `postgres://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `NEON_DATABASE_URL` | Direct Pooler Connection | `postgres://user:pass@ep-xyz.pooler.neon.tech/neondb` |
| `VAPI_API_KEY` | Vapi Private API Key | `re_...` (from dashboard.vapi.ai) |
| `VAPI_PHONE_NUMBER_ID` | Vapi Phone Number ID | `num_...` (from Vapi Phone Numbers tab) |
| `VAPI_ASSISTANT_ID` | (Optional) Vapi Assistant ID | `ast_...` (from Vapi Assistant tab) |
| `RESEND_API_KEY` | Resend Email API Key | `re_...` (from resend.com) |
| `FASTAPI_URL` | (Optional) Python ML Service URL | `https://your-ml-service.onrender.com` |

### Step 2: Deploying via Vercel CLI or GitHub Integration

#### Method A: Automatic GitHub Push (Recommended)
Since your repository is linked to GitHub:
```bash
git push origin main
```
Vercel will automatically trigger a production build and deploy your changes.

#### Method B: Deploying manually via Vercel CLI
```bash
npm i -g vercel
vercel --prod
```

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: v18.x or v20.x
- **Package Manager**: `npm` or `pnpm`
- **Python**: v3.10+ (if running the local ML service)

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/AnirudhY-025/CTRL-CAT.git
cd CTRL-CAT
npm install react-zxing @zxing/library
npm install
```

### Step 2: Set Up Local Environment
Create `.env.local` in the project root:
```env
DATABASE_URL=postgres://...
VAPI_API_KEY=your_vapi_private_key
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
VAPI_ASSISTANT_ID=your_vapi_assistant_id
RESEND_API_KEY=your_resend_api_key
```

### Step 3: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Browser Use Agent Showcase

The repository includes a small, judge-visible Browser Use Cloud agent scaffold.
Its default command is a credential-free dry run; it demonstrates the intended
agent integration without opening a browser or contacting external services:

```bash
pnpm agent:showcase
```

The optional live path uses `BROWSER_USE_API_KEY`, `BROWSER_USE_MODEL`, and a
reachable `E2E_BASE_URL`:

```bash
uv sync
BROWSER_USE_API_KEY=... E2E_BASE_URL=https://staging.example.com \
  python tests/agent/harness_agent.py --execute
```

This showcase is intentionally not part of the pull-request test suite.

---

## 🛠️ Tech Stack Overview

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS, Shadcn UI, Lucide Icons
- **GIS Maps**: OpenStreetMap, Leaflet, React-Leaflet
- **QR Scanner**: `react-zxing`, `@zxing/library`
- **Database**: Neon PostgreSQL
- **Voice AI**: Vapi AI SDK & REST API
- **Email Gateway**: Resend API
- **ML Backend**: Python, FastAPI, Pandas, Scikit-Learn
