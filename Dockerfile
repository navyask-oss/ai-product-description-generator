FROM golang:1.22-bookworm AS api-build
WORKDIR /src/api
COPY api/go.mod ./
RUN go mod download
COPY api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12
WORKDIR /app
COPY --from=api-build /out/server /app/server
COPY prompts /prompts
ENV PORT=8080
EXPOSE 8080
CMD ["/app/server"]
