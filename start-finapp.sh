#!/bin/bash

# FinApp Full Application Startup Script
echo "🚀 Starting FinApp - Complete Financial Management System"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[FINAPP]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running ✓"

# Stop any existing containers
print_header "Cleaning up existing containers..."
docker compose down -v 2>/dev/null || true

# Start the complete application
print_header "Starting all FinApp services..."

# Build and start all services
print_status "Building and starting services..."
docker compose up --build -d

# Wait for services to be ready
print_header "Waiting for services to be ready..."

# Function to check service health
check_service_health() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose ps | grep -q "$service_name.*healthy"; then
            print_status "$service_name is healthy ✓"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "$service_name failed to become healthy after ${max_attempts} attempts"
            return 1
        fi
        
        print_warning "Waiting for $service_name to be healthy... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
}

# Check all critical services
print_status "Checking service health..."

services=("postgres" "redis" "auth" "collection" "processing" "subscription-detector" "analysis-control" "ml-service" "gateway")

all_healthy=true
for service in "${services[@]}"; do
    if ! check_service_health "$service"; then
        all_healthy=false
    fi
done

# Display final status
echo ""
echo "=========================================================="
if [ "$all_healthy" = true ]; then
    print_status "🎉 All FinApp services are running successfully!"
    echo ""
    echo "📊 Service URLs:"
    echo "   🌐 API Gateway:     http://localhost:8080"
    echo "   🔐 Auth Service:    http://localhost:8082"
    echo "   📥 Collection:      http://localhost:8080/collection"
    echo "   ⚙️  Processing:      http://localhost:8081"
    echo "   🔍 Subscriptions:   http://localhost:8083"
    echo "   📈 Analysis:        http://localhost:8084"
    echo "   🤖 ML Service:      http://localhost:8000"
    echo "   🗄️  PostgreSQL:      localhost:5433"
    echo "   🔴 Redis:           localhost:6379"
    echo ""
    echo "📱 Mobile App:"
    echo "   📲 Expo Dev:        http://localhost:19000"
    echo ""
    echo "🛠️  Useful Commands:"
    echo "   📋 View logs:       docker compose logs -f [service-name]"
    echo "   🛑 Stop all:        docker compose down"
    echo "   🔄 Restart:        docker compose restart [service-name]"
    echo "   📊 Status:          docker compose ps"
    echo ""
    echo "🧪 Test the system:"
    echo "   🔍 Health check:    curl http://localhost:8080/health"
    echo "   📝 Test API:        ./test-system.js"
else
    print_error "Some services failed to start properly."
    echo ""
    echo "🔍 Check logs for troubleshooting:"
    echo "   📋 All logs:        docker compose logs"
    echo "   📋 Specific logs:   docker compose logs [service-name]"
    echo ""
    echo "🔄 To restart:        ./start-finapp.sh"
    echo "🛑 To stop:           ./stop-finapp.sh"
fi

echo "=========================================================="
