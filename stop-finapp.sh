#!/bin/bash

# FinApp Full Application Stop Script
echo "🛑 Stopping FinApp - Complete Financial Management System"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[FINAPP]${NC} $1"
}

print_header "Stopping all FinApp services..."

# Stop and remove all containers
print_status "Stopping Docker containers..."
docker compose down -v

# Clean up any remaining containers
print_status "Cleaning up any remaining containers..."
docker compose down --remove-orphans 2>/dev/null || true

# Clean up unused images (optional)
print_status "Cleaning up unused Docker images..."
docker image prune -f 2>/dev/null || true

print_status "✅ All FinApp services stopped successfully!"
echo ""
echo "🔄 To restart:        ./start-finapp.sh"
echo "📋 Check status:      docker compose ps"
echo "=========================================================="
