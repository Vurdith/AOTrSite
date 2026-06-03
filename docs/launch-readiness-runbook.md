# Launch Readiness Runbook

This checklist covers the attack-readiness work that must be configured outside the codebase before a public launch.

## Monitoring

- Add uptime checks for `GET /api/health`, `GET /values`, and `GET /calculator`.
- Alert when `/api/health` returns non-200 twice in a row, or response time stays above 2 seconds for 5 minutes.
- Watch host metrics for 4xx spikes, 5xx spikes, function duration, and bandwidth anomalies.
- Review Supabase dashboard alerts for connection pressure, CPU, failed auth, and database errors during launch day.
- Set `ERROR_WEBHOOK_URL` if you want server request errors mirrored to an external incident channel. Native Sentry can replace this later, but the app now has a central error-reporting hook.

## Edge Protection

- Put the site behind Vercel Firewall or Cloudflare WAF before broad release.
- Block known scanner paths already rejected by app proxy: `.env`, `.git`, `wp-admin`, `wp-login`, `xmlrpc.php`, `phpmyadmin`, `pma`, `phpunit`, `shell`, `cmd`, path traversal, null bytes, and encoded backslashes.
- Add managed rules for SQL injection, XSS, bot score, browser integrity, and common CVE probes.
- Add rate limits at the edge:
  - `/api/auth/discord/*`: 30 requests per minute per IP.
  - `/api/trades` writes: 20 requests per minute per IP.
  - `/api/admin/*`: 45 mutating requests per minute per IP.
  - `/api/admin/media/upload`: 8 requests per minute per IP.
  - `/api/*`: 120 requests per minute per IP.
- Challenge or block countries/ASNs only if launch traffic proves abusive; do not start with broad geo blocking unless the audience is known.

## Backups

- Use Admin > Controls > Export Backup before every bulk import, currency-rate change, or release-day data edit.
- Use Admin > Controls > Restore Backup only from a trusted owner account. Leave "Delete live items missing from backup" off unless the backup is meant to be a full replacement.
- Store backups outside the deployment account, such as a private drive, object bucket, or password manager attachment.
- Keep at least 7 daily exports and the final pre-launch export.
- Confirm Supabase project backups/PITR are enabled on the production plan before sending public traffic.

## Admin Roles

- Prefer the role env vars over the legacy `DISCORD_ADMIN_USER_IDS` list:
  - `DISCORD_OWNER_USER_IDS`: restore backups, seed, delete, edit, upload, audit.
  - `DISCORD_EDITOR_USER_IDS`: edit values/settings, upload, export, audit.
  - `DISCORD_MEDIA_USER_IDS`: upload item media only.
  - `DISCORD_AUDITOR_USER_IDS`: read logs and export backups.
- Keep owner accounts to the absolute minimum and require Discord account 2FA for those users.
- `DISCORD_ADMIN_USER_IDS` still works as owner access for compatibility, but should be phased out.

## Rollback

- Keep the last successful deployment available in Vercel.
- If public pages fail but admin is healthy, roll back the deployment first.
- If market data is corrupted, export the current broken snapshot for forensics, then restore from the latest known-good admin backup.
- If Supabase direct API permissions change unexpectedly, reapply the latest lockdown migration and verify anonymous REST requests are denied.

## Incident Response

- Use Admin > Logs for changed item, settings, media, seed, and backup events. Actor records include Discord identity, user-agent, and a short IP hash for correlation.
- Rotate `DISCORD_SESSION_SECRET` or `ADMIN_SESSION_SECRET` if admin cookies may be exposed.
- Rotate Discord OAuth credentials, Supabase service keys, and R2 credentials after any confirmed secret exposure.
- Temporarily disable public write endpoints at the edge during active abuse rather than deploying code changes under pressure.

## Pre-Launch Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm audit`
- Local smoke load test: `LOAD_TEST_URL=http://localhost:3000 npm run load:test`
- Production warm-path load test after WAF is active: `LOAD_TEST_URL=https://your-domain.example LOAD_TEST_CONCURRENCY=80 LOAD_TEST_DURATION_MS=120000 npm run load:test`
- Confirm `/api/health` is monitored.
- Confirm direct Supabase REST with the publishable key returns permission denied for locked tables.
- Confirm Cloudflare/Vercel WAF is active before announcing the site.
