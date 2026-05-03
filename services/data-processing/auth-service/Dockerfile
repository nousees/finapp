FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy go.mod first and download dependencies
COPY go.mod ./
RUN go mod download

# Copy source code
COPY . .

# Generate go.sum and build
RUN go mod tidy
RUN go build -o main ./cmd/main.go

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .
COPY --from=builder /app/.env .
COPY --from=builder /app/config/config.yaml ./config/

EXPOSE 8080

CMD ["./main"]
