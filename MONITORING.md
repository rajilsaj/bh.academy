# Vercel Deployment Monitoring

Automated monitoring scripts for tracking Vercel deployments and attempting fixes on common errors.

## Scripts Available

### 1. **monitor-vercel.sh** (Recommended - Bash Version)

Simple shell script that continuously monitors deployment status.

**Features:**
- ✅ Continuous status checking every 30 seconds
- ✅ Automatic error detection (Type errors, missing modules, export issues)
- ✅ Auto-fix for missing modules (runs `npm install`)
- ✅ Dependency recovery (reinstall node_modules)
- ✅ Colored output for easy reading
- ✅ Logs to `.vercel-monitor.log`

**Usage:**

```bash
# Make executable
chmod +x scripts/monitor-vercel.sh

# Run the monitor
bash scripts/monitor-vercel.sh

# Or in background
bash scripts/monitor-vercel.sh &
```

**What it does:**
1. Checks if site is responding (HTTP 200)
2. After 3 failed checks, fetches Vercel logs
3. Scans logs for known errors
4. Attempts automatic fixes:
   - Missing module? → runs `npm install <module>`
   - Dependency issue? → `npm install` and commits
5. Pushes fixes to trigger re-deployment
6. Continues monitoring

### 2. **monitor-and-fix.ts** (Node.js/TypeScript Version)

More advanced version with detailed error parsing.

**Features:**
- 📊 Structured error analysis
- 🔍 Context-aware suggestions
- 💡 Smart fix recommendations
- 📝 Detailed logging
- ⏱️ Deployment timeout detection

**Usage:**

```bash
# Run with npx/tsx
npx tsx scripts/monitor-and-fix.ts

# Or compile and run
npx tsc scripts/monitor-and-fix.ts
node scripts/monitor-and-fix.js
```

## Supported Auto-Fixes

| Error Type | Detection | Auto-Fix | Details |
|-----------|-----------|----------|---------|
| Missing Module | `Module not found` | ✅ Yes | `npm install <module>` |
| Dependency | Install fails | ✅ Yes | Reinstall everything |
| Type Error | `Type error:` | ❌ No | Requires manual review |
| Export Mismatch | `has no exported member` | ❌ No | Requires manual review |
| Migration Error | Migration fails | ❌ No | Requires manual review |

## Quick Start

### For Continuous Monitoring (Recommended)

```bash
# Terminal 1: Run the monitor
bash scripts/monitor-vercel.sh

# Output example:
# 🚀 Starting Vercel Deployment Monitor
# 📍 Monitoring: bh-academy-seven.vercel.app
# ⏱️  Check interval: 30s
# ---
# [08:41:46] Checking deployment status...
# ✅ Deployment is LIVE (HTTP 200)
# [08:42:16] Checking deployment status...
# ✅ Deployment is LIVE (HTTP 200)
```

### For CI/CD Pipeline

```bash
# Add to your CI/CD pipeline or cron job
*/5 * * * * cd /path/to/project && bash scripts/monitor-vercel.sh >> deployment-monitor.log 2>&1
```

### Manual Check

```bash
# Quick one-time check
curl -s -o /dev/null -w "%{http_code}\n" https://bh-academy-seven.vercel.app

# View recent logs
vercel logs bh-academy-seven.vercel.app --limit 50
```

## What Gets Auto-Fixed

### ✅ Automatic Fixes (No Confirmation)

1. **Missing Modules**
   ```
   Error: Module not found: 'xlsx'
   → Runs: npm install xlsx
   → Commits and pushes automatically
   ```

2. **Dependency Issues**
   ```
   Error: Multiple install failures
   → Runs: rm -rf node_modules && npm install
   → Commits and pushes automatically
   ```

### ⚠️ Manual Review Needed

1. **Type Errors** - Requires understanding of the code
2. **Export Mismatches** - Need to fix imports/exports
3. **Schema Conflicts** - Database schema issues
4. **Logic Errors** - Business logic problems

For these, the monitor will:
- Print the error details
- Suggest a fix
- Point you to the right file
- But require **manual intervention**

## Monitoring Flow

```
┌─────────────────────────┐
│  Check Site Status      │
│  (HTTP 200?)            │
└────────┬────────────────┘
         │
         ├─ YES → ✅ LIVE
         │         └─ Wait 30s
         │
         └─ NO (3x) → ⚠️ BUILD FAILING
                      │
                      ├─ Fetch Vercel Logs
                      ├─ Parse Errors
                      │
                      ├─ Auto-Fixable? 
                      │  ├─ YES → Apply Fix
                      │  │        └─ Push Changes
                      │  │           └─ Wait for Re-build
                      │  │
                      │  └─ NO → 🔴 MANUAL REVIEW NEEDED
                      │           └─ Print Error Context
                      │              └─ Suggest Fix
                      │
                      └─ Reset Counter & Continue
```

## Configuration

Edit the script to customize:

```bash
# In monitor-vercel.sh

PROJECT_URL="bh-academy-seven.vercel.app"  # Change if different URL
CHECK_INTERVAL=30                          # Check every 30 seconds
MAX_RETRIES=3                              # Fail after 3 checks
```

## Logs

Monitor logs are saved to:
- `.vercel-monitor.log` - Status and timestamps
- `deployment-monitor.log` - If run via cron

View logs:
```bash
tail -f .vercel-monitor.log       # Live tail
cat .vercel-monitor.log           # Full log
grep ERROR .vercel-monitor.log    # Error-only
```

## Troubleshooting

### Monitor won't start
```bash
# Check Vercel CLI is installed
which vercel

# If not, install it
npm install -g vercel

# Or use local version
npx vercel logs bh-academy-seven.vercel.app
```

### Monitor shows "Build in progress" forever
```bash
# Check Vercel dashboard
# https://vercel.com/bh-academy-seven

# If stuck, manually rebuild
vercel rebuild
```

### Auto-fix didn't work
```bash
# Check git status
git status

# View what was committed
git log --oneline -5

# Manual fix needed - edit code and push
# The monitor will detect the new push
```

## Advanced Usage

### Run in background with nohup
```bash
nohup bash scripts/monitor-vercel.sh > monitor.log 2>&1 &

# Check status
ps aux | grep monitor-vercel.sh
```

### Send alerts to Slack
```bash
# Modify script to add:
SLACK_WEBHOOK="https://hooks.slack.com/..."

curl -X POST "$SLACK_WEBHOOK" \
  -H 'Content-Type: application/json' \
  -d '{"text":"❌ Deployment failed"}'
```

### Enable email notifications
```bash
# Modify script to add at error detection:
echo "Deployment failed" | mail -s "Vercel Alert" your@email.com
```

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Module not found: xlsx` | Missing dependency | `npm install xlsx` |
| `Type error: ...` | TypeScript issue | Review and fix types |
| `Does not exist on type` | Schema mismatch | Update schema/types |
| `Cannot find module '@/lib/...'` | Path alias issue | Check tsconfig |
| `Connection timeout` | Network issue | Check VPN/firewall |

## Development Tips

### Testing the monitor locally

```bash
# Simulate deployment failure
cd scripts && npm uninstall some-package
git push  # This will fail the build

# Monitor will detect and fix it
bash monitor-vercel.sh

# Watch as it auto-fixes!
```

### Customizing error detection

Edit `monitor-vercel.sh` and add new patterns to `detect_errors()`:

```bash
# Example: Add new error type
if echo "$logs" | grep -q "YourCustomError"; then
  echo -e "${RED}❌ Custom Error Detected${NC}"
  echo "$logs" | grep "YourCustomError"
  errors_found=1
fi
```

## Support

For issues with monitoring:
1. Check `.vercel-monitor.log` for error context
2. Verify Vercel CLI is installed: `vercel --version`
3. Ensure you're authenticated: `vercel login`
4. Check logs manually: `vercel logs bh-academy-seven.vercel.app`

---

**Happy deploying! 🚀**
