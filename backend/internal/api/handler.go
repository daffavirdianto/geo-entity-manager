// Package api exposes the entity store over HTTP.
package api

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/example/geo-entity-manager/backend/internal/entity"
	"github.com/example/geo-entity-manager/backend/internal/store"
)

const maxBody = 1 << 20 // 1 MiB

type Handler struct{ Store store.Store }

func (h Handler) Routes(corsOrigin string) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/entities", h.list)
	mux.HandleFunc("POST /api/entities", h.create)
	mux.HandleFunc("GET /api/entities/{id}", h.get)
	mux.HandleFunc("PUT /api/entities/{id}", h.update)
	mux.HandleFunc("DELETE /api/entities/{id}", h.remove)
	mux.HandleFunc("/api/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, "not_found", "route not found")
	})
	return recoverer(logger(cors(corsOrigin, mux)))
}

func (h Handler) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := store.Filter{Type: q.Get("type"), Status: q.Get("status"), Query: q.Get("q")}
	if f.Type != "" && !contains(entity.Types, f.Type) {
		writeFields(w, http.StatusBadRequest, map[string]string{"type": "must be one of: " + strings.Join(entity.Types, ", ")})
		return
	}
	if f.Status != "" && !contains(entity.Statuses, f.Status) {
		writeFields(w, http.StatusBadRequest, map[string]string{"status": "must be one of: " + strings.Join(entity.Statuses, ", ")})
		return
	}
	items, err := h.Store.List(f)
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h Handler) get(w http.ResponseWriter, r *http.Request) {
	e, err := h.Store.Get(r.PathValue("id"))
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (h Handler) create(w http.ResponseWriter, r *http.Request) {
	in, ok := decode(w, r)
	if !ok {
		return
	}
	e, err := h.Store.Create(in)
	if err != nil {
		serverError(w, err)
		return
	}
	w.Header().Set("Location", "/api/entities/"+e.ID)
	writeJSON(w, http.StatusCreated, e)
}

func (h Handler) update(w http.ResponseWriter, r *http.Request) {
	in, ok := decode(w, r)
	if !ok {
		return
	}
	e, err := h.Store.Update(r.PathValue("id"), in)
	if err != nil {
		storeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (h Handler) remove(w http.ResponseWriter, r *http.Request) {
	if err := h.Store.Delete(r.PathValue("id")); err != nil {
		storeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func decode(w http.ResponseWriter, r *http.Request) (entity.Input, bool) {
	var in entity.Input
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "request body too large")
		} else {
			writeError(w, http.StatusBadRequest, "invalid_json", "request body is not valid JSON for this resource: "+err.Error())
		}
		return in, false
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		writeError(w, http.StatusBadRequest, "invalid_json", "request body must contain a single JSON object")
		return in, false
	}
	in.Normalize()
	if errs := in.Validate(); len(errs) > 0 {
		writeFields(w, http.StatusUnprocessableEntity, errs)
		return in, false
	}
	return in, true
}

func storeError(w http.ResponseWriter, err error) {
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not_found", "entity not found")
		return
	}
	serverError(w, err)
}

func serverError(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	writeError(w, http.StatusInternalServerError, "internal_error", "something went wrong")
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, msg string) {
	writeJSON(w, status, map[string]any{"error": code, "message": msg})
}

func writeFields(w http.ResponseWriter, status int, fields map[string]string) {
	code := "validation_failed"
	writeJSON(w, status, map[string]any{"error": code, "message": "one or more fields are invalid", "fields": fields})
}

func contains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}
