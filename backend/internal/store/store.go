package store

import (
	"errors"

	"github.com/example/geo-entity-manager/backend/internal/entity"
)

var ErrNotFound = errors.New("entity not found")

type Filter struct {
	Type   string
	Status string
	Query  string
}

type Store interface {
	List(Filter) ([]entity.Entity, error)
	Get(id string) (entity.Entity, error)
	Create(entity.Input) (entity.Entity, error)
	Update(id string, in entity.Input) (entity.Entity, error)
	Delete(id string) error
	Count() int
}
