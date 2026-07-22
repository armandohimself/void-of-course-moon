# Void of Course Moon

Void of Course Moon is a lightweight scheduling widget built with Next.js, Supabase, Google Calendar, and Astronomy Engine. It exposes a public booking page, an embeddable iframe route, and blocks booking during computed Void-of-Course (VOC) Moon windows.

## Features

- Single-host scheduling flow with a fixed meeting duration
- Weekly availability rules stored in Supabase
- VOC Moon windows computed from Astronomy Engine and cached in Postgres
- Google Calendar FreeBusy subtraction plus event creation on booking
- Double-booking protection via a database unique constraint
- Public `/book` page and minimal `/embed` iframe view

## Required environment variables

Copy `.env.example` to `.env.local` and fill in every value:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_HOST_REFRESH_TOKEN` (optional fallback if you do not store the token in the database)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `SESSION_SECRET`
- `HOST_TIMEZONE` (for example `America/New_York`)
- `MEETING_DURATION_MINUTES` (defaults to `30`)

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example`.
3. Apply the SQL in `supabase/migrations/0001_mvp.sql` to your Supabase project.
4. Update the `host_config` row with your weekly availability JSON, timezone, duration, and preferred `body_set` (`modern` or `traditional`).
5. Start the app:
   ```bash
   npm run dev
   ```

## Host availability configuration

The `host_config.availability_rules` column stores JSON shaped like this:

```json
{
  "1": [{ "start": "09:00", "end": "17:00" }],
  "2": [{ "start": "09:00", "end": "17:00" }],
  "3": [{ "start": "09:00", "end": "17:00" }],
  "4": [{ "start": "09:00", "end": "17:00" }],
  "5": [{ "start": "09:00", "end": "17:00" }]
}
```

Keys use JavaScript weekday numbering (`0 = Sunday`, `6 = Saturday`) and each range is interpreted in `host_config.timezone`.

## One-time Google OAuth setup

1. Ensure `GOOGLE_REDIRECT_URI` points to `/api/auth/google/callback` on your deployment.
2. Visit `/api/auth/google` while signed in as the host Google account.
3. Approve the `calendar.events` scope.
4. The callback encrypts the refresh token with `ENCRYPTION_KEY` and stores it in `host_config.encrypted_google_refresh_token`.
5. After that, availability checks and bookings run server-side with the stored refresh token.

## VOC recomputation

- A Vercel cron is configured in `vercel.json` to hit `/api/cron/voc` daily.
- The app also lazily recomputes the cache if the stored VOC windows do not extend far enough into the requested range.
- All VOC timestamps are stored in UTC in `voc_windows`.

## Testing

Run the targeted VOC unit tests:

```bash
npm test
```

## Embed snippet

Use the minimal iframe route anywhere you want to embed the widget:

```html
<iframe
  src="https://your-domain.example/embed"
  title="Schedule a meeting"
  width="100%"
  height="720"
  style="border: 0; max-width: 960px"
  loading="lazy"
></iframe>
```

## Important routes

- `/book` – public booking page
- `/embed` – iframe-friendly version
- `/api/availability?from=...&to=...`
- `/api/book`
- `/api/voc?from=...&to=...`
- `/api/auth/google`
- `/api/auth/google/callback`
- `/api/cron/voc`
