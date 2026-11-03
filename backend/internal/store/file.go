package store

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/example/geo-entity-manager/backend/internal/entity"
)

type FileStore struct {
	mu   sync.RWMutex
	path string
	data map[string]entity.Entity
}

func NewFileStore(path string) (*FileStore, error) {
	s := &FileStore{path: path, data: map[string]entity.Entity{}}
	if path == "" {
		return s, nil
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(path)
	switch {
	case os.IsNotExist(err):
		return s, nil
	case err != nil:
		return nil, err
	}
	var list []entity.Entity
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &list); err != nil {
			return nil, fmt.Errorf("corrupt data file %s: %w", path, err)
		}
	}
	for _, e := range list {
		e.Type = entity.MigrateLegacyType(e.Type)
		s.data[e.ID] = e
	}
	return s, nil
}

func (s *FileStore) List(f Filter) ([]entity.Entity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	q := strings.ToLower(strings.TrimSpace(f.Query))
	out := make([]entity.Entity, 0, len(s.data))
	for _, e := range s.data {
		if f.Type != "" && e.Type != f.Type {
			continue
		}
		if f.Status != "" && e.Status != f.Status {
			continue
		}
		if q != "" && !strings.Contains(strings.ToLower(e.Name), q) {
			continue
		}
		out = append(out, e)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].CreatedAt.Equal(out[j].CreatedAt) {
			return out[i].ID < out[j].ID
		}
		return out[i].CreatedAt.Before(out[j].CreatedAt)
	})
	return out, nil
}

func (s *FileStore) Get(id string) (entity.Entity, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.data[id]
	if !ok {
		return entity.Entity{}, ErrNotFound
	}
	return e, nil
}

func (s *FileStore) Create(in entity.Input) (entity.Entity, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	e := entity.Entity{
		ID: newID(), Name: in.Name, Type: in.Type, Status: in.Status,
		Latitude: *in.Latitude, Longitude: *in.Longitude, Description: in.Description,
		CreatedAt: now, UpdatedAt: now,
	}
	s.data[e.ID] = e
	if err := s.persist(); err != nil {
		delete(s.data, e.ID)
		return entity.Entity{}, err
	}
	return e, nil
}

func (s *FileStore) Update(id string, in entity.Input) (entity.Entity, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	old, ok := s.data[id]
	if !ok {
		return entity.Entity{}, ErrNotFound
	}
	e := old
	e.Name, e.Type, e.Status, e.Description = in.Name, in.Type, in.Status, in.Description
	e.Latitude, e.Longitude = *in.Latitude, *in.Longitude
	e.UpdatedAt = time.Now().UTC()
	s.data[id] = e
	if err := s.persist(); err != nil {
		s.data[id] = old
		return entity.Entity{}, err
	}
	return e, nil
}

func (s *FileStore) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	old, ok := s.data[id]
	if !ok {
		return ErrNotFound
	}
	delete(s.data, id)
	if err := s.persist(); err != nil {
		s.data[id] = old
		return err
	}
	return nil
}

func (s *FileStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.data)
}

func (s *FileStore) persist() error {
	if s.path == "" {
		return nil
	}
	list := make([]entity.Entity, 0, len(s.data))
	for _, e := range s.data {
		list = append(list, e)
	}
	raw, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func newID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
