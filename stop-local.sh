#!/bin/bash

# FinApp Local Stop Script
echo "🛑 Stopping FinApp services..."

# Stop Go services
if [ -f /tmp/finapp_pids.txt ]; then
    while read pid; do
        if kill -0 $pid 2>/dev/null; then
            echo "🔧 Stopping service (PID: $pid)"
            kill $pid
        fi
    done < /tmp/finapp_pids.txt
    rm /tmp/finapp_pids.txt
fi

# Stop Docker services
echo "📦 Stopping Docker services..."
docker compose down

echo "✅ All services stopped!"
