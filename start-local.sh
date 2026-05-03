#!/bin/bash

# FinApp Local Startup Script
echo "🚀 Starting FinApp services locally..."

# Start Docker services (PostgreSQL + Redis)
echo "📦 Starting Docker services..."
docker compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
sleep 5

# Start Go services in background
echo "🔧 Starting Go services..."

# Auth Service
cd services/data-processing/auth-service
go run ./cmd/main.go &
AUTH_PID=$!
echo "✅ Auth service started (PID: $AUTH_PID, Port: 8082)"

# Collection Service  
cd ../collection
go run ./cmd/collection/main.go &
COLLECTION_PID=$!
echo "✅ Collection service started (PID: $COLLECTION_PID, Port: 8080)"

# Processing Service
cd ../processing
go run ./cmd/processing/main.go &
PROCESSING_PID=$!
echo "✅ Processing service started (PID: $PROCESSING_PID, Port: 8081)"

# Subscription Detector Service
cd ../subscription-detector
go run ./cmd/subscription-detector/main.go &
SUBSCRIPTION_PID=$!
echo "✅ Subscription detector started (PID: $SUBSCRIPTION_PID, Port: 8083)"

# ML Service
cd ../../ml-service
python setup_ml.py &
ML_PID=$!
echo "✅ ML service started (PID: $ML_PID)"

echo ""
echo "🎉 All services started!"
echo "📊 Service URLs:"
echo "   - Auth: http://localhost:8082"
echo "   - Collection: http://localhost:8080" 
echo "   - Processing: http://localhost:8081"
echo "   - Subscription Detector: http://localhost:8083"
echo "   - ML Service: http://localhost:8000"
echo ""
echo "🛑 To stop all services, run: ./stop-local.sh"

# Save PIDs to file for stopping
echo $AUTH_PID > /tmp/finapp_pids.txt
echo $COLLECTION_PID >> /tmp/finapp_pids.txt
echo $PROCESSING_PID >> /tmp/finapp_pids.txt
echo $SUBSCRIPTION_PID >> /tmp/finapp_pids.txt
echo $ML_PID >> /tmp/finapp_pids.txt

wait
