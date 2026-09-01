# Telemetry status

The rental operations UI treats engine hours, idle hours, fuel level, and condition as read-only asset telemetry.

The current prototype uses static seeded snapshots. Operators cannot manually edit or submit usage readings, and the UI does not poll, simulate, or ingest machinery data.

Real-time machinery telemetry is intentionally deferred. A future integration should update the read-only asset snapshot from the machinery source and append an activity event when a meaningful telemetry update is received. Until that integration exists, the seeded values and the existing activity timeline are the source of truth for the prototype.
