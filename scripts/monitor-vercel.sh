#!/bin/bash
# Vercel Deployment Monitor with Auto-Fix
# Continuously monitors Vercel logs and attempts to fix common issues

set -e

PROJECT_URL="bh-academy-seven.vercel.app"
CHECK_INTERVAL=30
MAX_RETRIES=3
RETRY_COUNT=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$LOG_DIR/.vercel-monitor.log"

# Initialize log
echo "=== Vercel Deployment Monitor ===" > "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

echo -e "${BLUE}🚀 Starting Vercel Deployment Monitor${NC}"
echo -e "${BLUE}📍 Monitoring: $PROJECT_URL${NC}"
echo -e "${BLUE}⏱️  Check interval: ${CHECK_INTERVAL}s${NC}"
echo -e "${BLUE}---${NC}"

# Function to check deployment status
check_status() {
  echo "[$(date '+%H:%M:%S')] Checking deployment status..."

  # Check if site is up
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$PROJECT_URL" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Deployment is LIVE (HTTP 200)${NC}"
    RETRY_COUNT=0
    return 0
  elif [ "$HTTP_CODE" = "000" ]; then
    echo -e "${YELLOW}⏳ Build in progress or site unreachable...${NC}"
    return 1
  else
    echo -e "${RED}❌ Site returned HTTP $HTTP_CODE${NC}"
    return 1
  fi
}

# Function to fetch recent Vercel logs
fetch_logs() {
  echo -e "${BLUE}📋 Fetching Vercel logs...${NC}"

  if command -v vercel &> /dev/null; then
    vercel logs "$PROJECT_URL" --limit 50 2>/dev/null || echo "Failed to fetch logs"
  else
    echo -e "${YELLOW}⚠️  Vercel CLI not found${NC}"
    return 1
  fi
}

# Function to detect common errors in logs
detect_errors() {
  local logs="$1"
  local errors_found=0

  # Type errors
  if echo "$logs" | grep -q "Type error:"; then
    echo -e "${RED}❌ Type Error Detected${NC}"
    echo "$logs" | grep "Type error:" | head -3
    errors_found=1
  fi

  # Module not found
  if echo "$logs" | grep -q "Module not found\|Cannot find module"; then
    echo -e "${RED}❌ Missing Module Detected${NC}"
    echo "$logs" | grep -E "Module not found|Cannot find module" | head -3

    # Auto-fix: Install missing module
    local module=$(echo "$logs" | grep -oP "(?<=[''])([^']+)(?=[''])" | head -1)
    if [ ! -z "$module" ]; then
      echo -e "${YELLOW}📦 Attempting to install: $module${NC}"
      if npm install "$module" 2>/dev/null; then
        echo -e "${GREEN}✅ Installed $module${NC}"
        git add package.json package-lock.json
        git commit -m "Fix: Install missing module $module" 2>/dev/null || true
        git push origin main 2>/dev/null || true
        errors_found=2 # Return code for "fix attempted"
      fi
    fi
  fi

  # Missing property
  if echo "$logs" | grep -q "does not exist on type"; then
    echo -e "${RED}❌ Missing Property Error${NC}"
    echo "$logs" | grep "does not exist on type" | head -3
    errors_found=1
  fi

  # Export mismatch
  if echo "$logs" | grep -q "has no exported member\|is not exported"; then
    echo -e "${RED}❌ Export Mismatch Error${NC}"
    echo "$logs" | grep -E "has no exported member|is not exported" | head -3
    errors_found=1
  fi

  return $errors_found
}

# Function to attempt auto-recovery
attempt_recovery() {
  echo -e "${YELLOW}🔧 Attempting automatic recovery...${NC}"

  # Check for common fixes
  echo "Checking for common issues..."

  # Fix 1: Reinstall dependencies
  echo -e "${BLUE}Try 1: Cleaning and reinstalling dependencies${NC}"
  rm -rf node_modules package-lock.json 2>/dev/null || true
  if npm install 2>&1 | tail -5; then
    git add package-lock.json
    git commit -m "Fix: Reinstall dependencies" 2>/dev/null || true
    git push origin main 2>/dev/null || true
    return 0
  fi

  return 1
}

# Main monitoring loop
monitor_loop() {
  echo -e "${BLUE}Starting continuous monitoring...${NC}\n"

  while true; do
    if check_status; then
      # Site is up and running
      sleep $CHECK_INTERVAL
    else
      RETRY_COUNT=$((RETRY_COUNT + 1))

      if [ $RETRY_COUNT -ge 3 ]; then
        echo -e "${RED}⚠️  Build failing after $RETRY_COUNT checks${NC}"

        # Fetch and analyze logs
        logs=$(fetch_logs)

        if [ ! -z "$logs" ]; then
          echo ""
          detect_errors "$logs"
          error_status=$?

          echo ""

          if [ $error_status -eq 1 ]; then
            echo -e "${YELLOW}Manual review needed. Common error found.${NC}"
            echo -e "${YELLOW}Check logs at: https://vercel.com${NC}"
          elif [ $error_status -eq 2 ]; then
            echo -e "${GREEN}Auto-fix attempted, waiting for re-deployment...${NC}"
            RETRY_COUNT=0
          fi
        fi

        echo -e "\n${BLUE}---${NC}\n"
        RETRY_COUNT=0
      fi

      sleep $CHECK_INTERVAL
    fi
  done
}

# Trap CTRL+C
trap_exit() {
  echo -e "\n${BLUE}👋 Monitor stopped${NC}"
  echo "Stopped: $(date)" >> "$LOG_FILE"
  exit 0
}

trap trap_exit SIGINT

# Start monitoring
monitor_loop
