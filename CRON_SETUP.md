# Google Forms Auto-Sync Cron Setup

## Overview
Continuous automatic sync of Google Form submissions to the learners database every **15 minutes**.

## Current Configuration

- **Schedule**: Every 15 minutes (`*/15 * * * *`)
- **Endpoint**: `/api/cron/sync-learners`
- **Actions**: Create, Update, Skip learners based on validation status
- **Vercel**: Built-in Cron Jobs (included in vercel.json)

## How It Works

### Automatic Sync (Vercel Cron)
1. Every 15 minutes, Vercel calls `/api/cron/sync-learners`
2. Syncs new and updated Google Form submissions
3. **Pending learners**: Updated with latest form data
4. **Validated learners**: Protected (never overwritten)
5. Results logged to Vercel logs

### Manual Trigger
Admin users can manually trigger sync:
```bash
POST /admin/api/trigger-sync
```

This is useful for:
- Testing sync logic locally
- Immediate sync without waiting 15 minutes
- Manual batch imports from Google Forms

## Environment Variables

Required in Vercel and `.env.local`:

```env
CRON_SECRET=your-secret-key-here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_SHEETS_CREDENTIALS={...}
```

## Setup Instructions

### 1. Generate CRON_SECRET

```bash
# Generate a random secret (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Add to Vercel Environment

```bash
# Via Vercel CLI
vercel env add CRON_SECRET

# Or via Dashboard:
# 1. Go to Project Settings → Environment Variables
# 2. Add new: CRON_SECRET = (generated value)
# 3. Set to: Production, Preview, Development
```

### 3. Add to Local .env.local

```bash
CRON_SECRET=your-generated-secret
```

### 4. Deploy

```bash
git push origin main
# Vercel auto-deploys
```

## Monitoring

### View Cron Logs

**Vercel Dashboard:**
1. Go to Project → Logs
2. Filter by "cron" or "/api/cron/sync-learners"
3. See sync results with timestamps

**CLI:**
```bash
vercel logs --function /api/cron/sync-learners
```

### Success Example
```json
{
  "success": true,
  "timestamp": "2026-09-13T20:00:00.000Z",
  "duration": "2450ms",
  "message": "Sync: 3 created, 1 updated, 2 skipped",
  "results": {
    "total": 6,
    "created": 3,
    "updated": 1,
    "skipped": 2,
    "errors": []
  }
}
```

### Error Example
```json
{
  "error": "GOOGLE_SHEETS_CREDENTIALS not set",
  "timestamp": "2026-09-13T20:00:00.000Z"
}
```

## Customization

### Change Sync Frequency

Edit `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-learners",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

**Common schedules:**
- `*/5 * * * *` → Every 5 minutes
- `*/15 * * * *` → Every 15 minutes (current)
- `*/30 * * * *` → Every 30 minutes
- `0 */2 * * *` → Every 2 hours
- `0 7 * * *` → Daily at 7:00 AM UTC
- `0 9-17 * * 1-5` → Every hour, 9 AM-5 PM, weekdays only

### Disable Cron

Remove from `vercel.json`:
```json
{
  "crons": []
}
```

## Troubleshooting

### Cron Not Running
1. ✅ Verify `vercel.json` is in root directory
2. ✅ Check `CRON_SECRET` is set in Vercel env vars
3. ✅ Deploy to Vercel (git push origin main)
4. ✅ Wait 5 minutes for first execution
5. ✅ Check Vercel logs for errors

### Sync Errors
1. Check if `GOOGLE_SHEETS_CREDENTIALS` is set
2. Verify Google service account has sheet access
3. Check if Supabase database is accessible
4. View full error in Vercel logs

### Learners Not Updating
1. Validated learners are protected (by design)
2. Only pending learners get updated from form
3. Check sync results: "skipped" shows protected learners
4. Use admin panel to manually update if needed

## API Reference

### GET /api/cron/sync-learners
Cron endpoint (called by Vercel)

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-09-13T20:00:00.000Z",
  "duration": "2450ms",
  "results": {...}
}
```

### POST /admin/api/trigger-sync
Manual sync trigger (admin only)

**Headers:**
```
Authorization: (via NextAuth session)
```

**Response:**
```json
{
  "success": true,
  "results": {...}
}
```

## Cost Considerations

- Vercel Cron: **Included** (no extra cost)
- Every 15 min = 96 syncs/day
- Light database load (only new/updated learners)
- Minimal API quota usage with Google Sheets API

## Next Steps

1. ✅ Generate and set `CRON_SECRET`
2. ✅ Deploy to Vercel (`git push origin main`)
3. ✅ Monitor first sync in Vercel logs
4. ✅ Test manual trigger via admin panel
