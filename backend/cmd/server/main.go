package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/example/geo-entity-manager/backend/internal/api"
	"github.com/example/geo-entity-manager/backend/internal/store"
)

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func main() {
	addr := ":" + env("PORT", "8080")
	dataFile := env("DATA_FILE", "./data/entities.json")

	st, err := store.NewFileStore(dataFile)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	if env("SEED", "true") == "true" {
		seedIfEmpty(st)
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           api.Handler{Store: st}.Routes(env("CORS_ORIGIN", "*")),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
	}

	go func() {
		log.Printf("listening on %s (data: %s)", addr, dataFile)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
	log.Println("shutdown complete")
}
