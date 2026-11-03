FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

FROM alpine:3.20
RUN adduser -D app && mkdir /data && chown app /data
USER app
COPY --from=build /out/server /server
ENV PORT=8080 DATA_FILE=/data/entities.json
EXPOSE 8080
CMD ["/server"]
