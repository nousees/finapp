FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download && go mod tidy
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /processing ./cmd/processing

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /processing .
EXPOSE 8081
ENTRYPOINT ["./processing"]
