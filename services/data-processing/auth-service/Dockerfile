FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.* ./
COPY .env ./
COPY config/config.yaml ./config/

RUN go mod download && go mod tidy

COPY . .

RUN go build -o main ./cmd/main.go

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .
COPY --from=builder /app/.env .
COPY --from=builder /app/config/config.yaml ./config/

EXPOSE 8080

CMD ["./main"]
