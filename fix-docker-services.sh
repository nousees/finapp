#!/bin/bash

# Fix Docker services and start them
echo "🔧 Fixing Docker services..."

# Fix go.mod files for all services
echo "📦 Fixing Go modules..."
cd services/data-processing/auth-service && go mod tidy
cd ../collection && go mod tidy  
cd ../processing && go mod tidy
cd ../subscription-detector && go mod tidy

# Update Dockerfile ports
echo "🐳 Fixing Dockerfile configurations..."
cd ../auth-service
sed -i 's/EXPOSE 8080/EXPOSE 8082/' Dockerfile

cd ../collection  
sed -i 's/EXPOSE 8080/EXPOSE 8080/' Dockerfile

cd ../processing
sed -i 's/EXPOSE 8081/EXPOSE 8081/' Dockerfile

cd ../subscription-detector
sed -i 's/EXPOSE 8082/EXPOSE 8083/' Dockerfile

# Build and start all services
echo "🚀 Building and starting all services..."
cd ../../..
docker compose up --build -d

echo "✅ Docker services started!"
echo "📊 Service URLs:"
echo "   - Gateway: http://localhost:8080"
echo "   - Auth: http://localhost:8082"
echo "   - Collection: http://localhost:8080"
echo "   - Processing: http://localhost:8081" 
echo "   - Subscription Detector: http://localhost:8083"
