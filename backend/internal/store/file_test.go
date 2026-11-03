package store

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/example/geo-entity-manager/backend/internal/entity"
)

func f(v float64) *float64 { return &v }

func in(name, typ, status string) entity.Input {
	return entity.Input{Name: name, Type: typ, Status: status, Latitude: f(-6.2), Longitude: f(106.8)}
}

func TestCRUD(t *testing.T) {
	s, _ := NewFileStore("")
	e, err := s.Create(in("A", "truck", "active"))
	if err != nil || e.ID == "" {
		t.Fatalf("create: %v", err)
	}
	got, _ := s.Get(e.ID)
	if got.Name != "A" {
		t.Fatalf("get: %+v", got)
	}
	up, err := s.Update(e.ID, in("B", "warehouse", "inactive"))
	if err != nil || up.Name != "B" || !up.CreatedAt.Equal(e.CreatedAt) {
		t.Fatalf("update: %+v %v", up, err)
	}
	if err := s.Delete(e.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Get(e.ID); err != ErrNotFound {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
	if err := s.Delete(e.ID); err != ErrNotFound {
		t.Fatalf("want ErrNotFound on second delete, got %v", err)
	}
	if _, err := s.Update("nope", in("x", "truck", "active")); err != ErrNotFound {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestFilter(t *testing.T) {
	s, _ := NewFileStore("")
	s.Create(in("Truck Alpha", "truck", "active"))
	s.Create(in("Sensor 1", "sensor", "maintenance"))
	s.Create(in("Truck Beta", "truck", "inactive"))
	cases := []struct {
		f    Filter
		want int
	}{
		{Filter{}, 3}, {Filter{Type: "truck"}, 2}, {Filter{Status: "active"}, 1},
		{Filter{Query: "truck"}, 2}, {Filter{Type: "truck", Query: "beta"}, 1},
	}
	for _, c := range cases {
		got, _ := s.List(c.f)
		if len(got) != c.want {
			t.Errorf("%+v: got %d want %d", c.f, len(got), c.want)
		}
	}
}

func TestPersistence(t *testing.T) {
	p := filepath.Join(t.TempDir(), "sub", "data.json")
	s, err := NewFileStore(p)
	if err != nil {
		t.Fatal(err)
	}
	e, _ := s.Create(in("Persist", "warehouse", "active"))
	s2, err := NewFileStore(p)
	if err != nil {
		t.Fatal(err)
	}
	if got, err := s2.Get(e.ID); err != nil || got.Name != "Persist" {
		t.Fatalf("reload failed: %+v %v", got, err)
	}
}

func TestConcurrentWrites(t *testing.T) {
	p := filepath.Join(t.TempDir(), "data.json")
	s, _ := NewFileStore(p)
	done := make(chan struct{})
	for i := 0; i < 20; i++ {
		go func() {
			defer func() { done <- struct{}{} }()
			e, err := s.Create(in("c", "truck", "active"))
			if err != nil {
				t.Error(err)
				return
			}
			s.List(Filter{})
			s.Update(e.ID, in("d", "warehouse", "inactive"))
		}()
	}
	for i := 0; i < 20; i++ {
		<-done
	}
	if s.Count() != 20 {
		t.Fatalf("want 20, got %d", s.Count())
	}
	s2, err := NewFileStore(p)
	if err != nil || s2.Count() != 20 {
		t.Fatalf("reload: %v count=%d", err, s2.Count())
	}
}

func TestLegacyTypesAreMigratedOnLoad(t *testing.T) {
	p := filepath.Join(t.TempDir(), "data.json")
	old := `[{"id":"1","name":"Old","type":"iot_device","status":"active","latitude":1,"longitude":1,"description":"","created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"}]`
	if err := os.WriteFile(p, []byte(old), 0o644); err != nil {
		t.Fatal(err)
	}
	s, err := NewFileStore(p)
	if err != nil {
		t.Fatal(err)
	}
	if e, _ := s.Get("1"); e.Type != "sensor" {
		t.Fatalf("want sensor, got %q", e.Type)
	}
}
