# CTRL+CAT Equipment Operations

The canonical app is the Caterpillar operations dashboard. It reads equipment, sites, operators, telemetry, and activity through the Next.js route handlers in `app/api`.

## Configuration

Copy `.env.example` to `.env.local` and set:

```bash
DATABASE_URL=postgres://...
FASTAPI_URL=http://localhost:8000
```

Apply `db/migrations/001_unified_schema.sql`, then load `db/seed.sql` when a local dataset is needed. `FASTAPI_URL` is only required for ML inference routes.

## Development

```bash
pnpm install
pnpm dev
```

The dashboard is available at `/`. The ML service can be started separately from `ml-service` with the model files present in `ml-service/models`.
