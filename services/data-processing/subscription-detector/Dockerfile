FROM golang:1.23-alpine AS builder
WORKDIR /app

# Copy go.mod first and download dependencies
COPY go.mod ./
RUN go mod download

# Copy source code
COPY . .

# Generate go.sum and build
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -o /subscription-detector ./cmd/subscription-detector

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /subscription-detector .
EXPOSE 8082
ENTRYPOINT ["./subscription-detector"]
