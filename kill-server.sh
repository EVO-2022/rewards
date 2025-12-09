#!/bin/bash
# Kill all Node.js processes related to rewards project

echo "🔍 Finding processes on ports 3000 and 8080..."
PIDS_3000=$(lsof -ti:3000 2>/dev/null)
PIDS_8080=$(lsof -ti:8080 2>/dev/null)
PIDS_DEV=$(ps aux | grep -E "ts-node-dev.*rewards|npm.*rewards.*dev" | grep -v grep | awk '{print $2}')

if [ -n "$PIDS_3000" ] || [ -n "$PIDS_8080" ] || [ -n "$PIDS_DEV" ]; then
  echo "🛑 Killing processes..."
  [ -n "$PIDS_3000" ] && kill -9 $PIDS_3000 2>/dev/null && echo "  Killed processes on port 3000"
  [ -n "$PIDS_8080" ] && kill -9 $PIDS_8080 2>/dev/null && echo "  Killed processes on port 8080"
  [ -n "$PIDS_DEV" ] && kill -9 $PIDS_DEV 2>/dev/null && echo "  Killed dev processes"
  sleep 1
  echo "✅ All processes stopped"
else
  echo "✅ No processes found"
fi
