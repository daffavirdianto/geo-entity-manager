// Package entity defines the domain model and its validation rules.
package entity

import (
	"math"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

var (
	Types = []string{
		// vehicles
		"truck", "car", "motorcycle", "bus",
		// IoT devices
		"sensor", "gateway", "camera", "gps_tracker",
		// facilities
		"warehouse", "office", "factory", "gas_station", "charging_station",
		// anything else
		"other",
	}
	Statuses = []string{"active", "inactive", "maintenance"}
)

var legacyTypes = map[string]string{"vehicle": "car", "iot_device": "sensor", "facility": "office"}

func MigrateLegacyType(t string) string {
	if n, ok := legacyTypes[t]; ok {
		return n
	}
	return t
}

const (
	MaxNameLen        = 100
	MaxDescriptionLen = 500
)

type Entity struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Input struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Status      string   `json:"status"`
	Latitude    *float64 `json:"latitude"`
	Longitude   *float64 `json:"longitude"`
	Description string   `json:"description"`
}

func (in *Input) Normalize() {
	in.Name = strings.TrimSpace(in.Name)
	in.Description = strings.TrimSpace(in.Description)
	in.Type = strings.TrimSpace(in.Type)
	in.Status = strings.TrimSpace(in.Status)
}

func (in Input) Validate() map[string]string {
	errs := map[string]string{}

	switch n := utf8.RuneCountInString(in.Name); {
	case n == 0:
		errs["name"] = "is required"
	case n > MaxNameLen:
		errs["name"] = "must be at most 100 characters"
	}
	if !contains(Types, in.Type) {
		errs["type"] = "must be one of: " + strings.Join(Types, ", ")
	}
	if !contains(Statuses, in.Status) {
		errs["status"] = "must be one of: " + strings.Join(Statuses, ", ")
	}
	if utf8.RuneCountInString(in.Description) > MaxDescriptionLen {
		errs["description"] = "must be at most 500 characters"
	}
	checkCoord(errs, "latitude", in.Latitude, -90, 90)
	checkCoord(errs, "longitude", in.Longitude, -180, 180)
	return errs
}

func checkCoord(errs map[string]string, field string, v *float64, min, max float64) {
	switch {
	case v == nil:
		errs[field] = "is required"
	case math.IsNaN(*v) || math.IsInf(*v, 0):
		errs[field] = "must be a finite number"
	case *v < min || *v > max:
		errs[field] = "must be between " + fmtF(min) + " and " + fmtF(max)
	}
}

func fmtF(f float64) string { return strconv.FormatFloat(f, 'f', -1, 64) }

func contains(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}
