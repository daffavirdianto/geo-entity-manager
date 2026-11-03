package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/example/geo-entity-manager/backend/internal/entity"
	"github.com/example/geo-entity-manager/backend/internal/store"
)

func newServer(t *testing.T) http.Handler {
	t.Helper()
	s, _ := store.NewFileStore("")
	return Handler{Store: s}.Routes("*")
}

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

const goodBody = `{"name":"Truck 1","type":"truck","status":"active","latitude":-6.2,"longitude":106.8,"description":"d"}`

func TestCreateGetUpdateDelete(t *testing.T) {
	h := newServer(t)

	rec := do(t, h, "POST", "/api/entities", goodBody)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create: %d %s", rec.Code, rec.Body)
	}
	var created entity.Entity
	json.Unmarshal(rec.Body.Bytes(), &created)
	if created.ID == "" || rec.Header().Get("Location") == "" {
		t.Fatalf("missing id/location: %+v", created)
	}

	if rec = do(t, h, "GET", "/api/entities/"+created.ID, ""); rec.Code != 200 {
		t.Fatalf("get: %d", rec.Code)
	}

	upd := `{"name":"Truck 2","type":"truck","status":"maintenance","latitude":1,"longitude":2}`
	rec = do(t, h, "PUT", "/api/entities/"+created.ID, upd)
	var got entity.Entity
	json.Unmarshal(rec.Body.Bytes(), &got)
	if rec.Code != 200 || got.Name != "Truck 2" || got.Status != "maintenance" {
		t.Fatalf("update: %d %s", rec.Code, rec.Body)
	}

	if rec = do(t, h, "DELETE", "/api/entities/"+created.ID, ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rec.Code)
	}
	if rec = do(t, h, "GET", "/api/entities/"+created.ID, ""); rec.Code != http.StatusNotFound {
		t.Fatalf("get after delete: %d", rec.Code)
	}
}

func TestValidationErrors(t *testing.T) {
	h := newServer(t)
	rec := do(t, h, "POST", "/api/entities", `{"name":"","type":"x","status":"active","latitude":123,"longitude":106}`)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("want 422, got %d", rec.Code)
	}
	var body struct {
		Error  string            `json:"error"`
		Fields map[string]string `json:"fields"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "validation_failed" {
		t.Fatalf("error code: %q", body.Error)
	}
	for _, f := range []string{"name", "type", "latitude"} {
		if body.Fields[f] == "" {
			t.Errorf("expected field error for %s: %v", f, body.Fields)
		}
	}
	if _, bad := body.Fields["longitude"]; bad {
		t.Error("longitude is valid and must not be reported")
	}
}

func TestBadRequests(t *testing.T) {
	h := newServer(t)
	cases := map[string]string{
		"malformed":     `{`,
		"unknown field": `{"name":"a","type":"truck","status":"active","latitude":1,"longitude":1,"foo":1}`,
		"wrong type":    `{"name":"a","type":"truck","status":"active","latitude":"x","longitude":1}`,
		"two objects":   goodBody + goodBody,
	}
	for name, body := range cases {
		if rec := do(t, h, "POST", "/api/entities", body); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: want 400, got %d", name, rec.Code)
		}
	}
}

func TestNotFound(t *testing.T) {
	h := newServer(t)
	for _, c := range [][2]string{{"GET", "/api/entities/nope"}, {"DELETE", "/api/entities/nope"}, {"GET", "/api/unknown"}} {
		if rec := do(t, h, c[0], c[1], ""); rec.Code != http.StatusNotFound {
			t.Errorf("%v: want 404, got %d", c, rec.Code)
		}
	}
	if rec := do(t, h, "PUT", "/api/entities/nope", goodBody); rec.Code != http.StatusNotFound {
		t.Errorf("PUT unknown: %d", rec.Code)
	}
}

func TestListFilters(t *testing.T) {
	h := newServer(t)
	do(t, h, "POST", "/api/entities", goodBody)
	do(t, h, "POST", "/api/entities", `{"name":"Gateway","type":"sensor","status":"inactive","latitude":1,"longitude":1}`)

	count := func(path string) int {
		rec := do(t, h, "GET", path, "")
		var l []entity.Entity
		json.Unmarshal(rec.Body.Bytes(), &l)
		return len(l)
	}
	if n := count("/api/entities"); n != 2 {
		t.Errorf("all: %d", n)
	}
	if n := count("/api/entities?type=sensor"); n != 1 {
		t.Errorf("type: %d", n)
	}
	if n := count("/api/entities?q=truck&status=active"); n != 1 {
		t.Errorf("q+status: %d", n)
	}
	if rec := do(t, h, "GET", "/api/entities?type=bogus", ""); rec.Code != http.StatusBadRequest {
		t.Errorf("bad filter: %d", rec.Code)
	}
}

func TestCORSPreflight(t *testing.T) {
	h := newServer(t)
	rec := do(t, h, "OPTIONS", "/api/entities", "")
	if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Origin") == "" {
		t.Fatalf("preflight: %d %v", rec.Code, rec.Header())
	}
}

func TestListEmptyIsArrayNotNull(t *testing.T) {
	h := newServer(t)
	if body := strings.TrimSpace(do(t, h, "GET", "/api/entities", "").Body.String()); body != "[]" {
		t.Fatalf("want [], got %s", body)
	}
}
