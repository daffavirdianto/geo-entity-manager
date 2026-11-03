package entity

import (
	"math"
	"strings"
	"testing"
)

func f(v float64) *float64 { return &v }

func valid() Input {
	return Input{Name: "Truck 1", Type: "truck", Status: "active", Latitude: f(-6.2), Longitude: f(106.8)}
}

func TestValidate_OK(t *testing.T) {
	if errs := valid().Validate(); len(errs) != 0 {
		t.Fatalf("expected valid, got %v", errs)
	}
}

func TestValidate_Fields(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*Input)
		field  string
	}{
		{"empty name", func(i *Input) { i.Name = "" }, "name"},
		{"long name", func(i *Input) { i.Name = strings.Repeat("a", 101) }, "name"},
		{"bad type", func(i *Input) { i.Type = "boat" }, "type"},
		{"bad status", func(i *Input) { i.Status = "" }, "status"},
		{"long description", func(i *Input) { i.Description = strings.Repeat("a", 501) }, "description"},
		{"lat too high", func(i *Input) { i.Latitude = f(90.1) }, "latitude"},
		{"lat too low", func(i *Input) { i.Latitude = f(-91) }, "latitude"},
		{"lng too high", func(i *Input) { i.Longitude = f(180.5) }, "longitude"},
		{"lat missing", func(i *Input) { i.Latitude = nil }, "latitude"},
		{"lng NaN", func(i *Input) { i.Longitude = f(math.NaN()) }, "longitude"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			in := valid()
			tc.mutate(&in)
			if _, ok := in.Validate()[tc.field]; !ok {
				t.Fatalf("expected error on %q", tc.field)
			}
		})
	}
}

func TestValidate_Boundaries(t *testing.T) {
	in := valid()
	in.Latitude, in.Longitude = f(90), f(-180)
	if errs := in.Validate(); len(errs) != 0 {
		t.Fatalf("boundaries should be valid: %v", errs)
	}
}

func TestZeroCoordinateIsValid(t *testing.T) {
	in := valid()
	in.Latitude, in.Longitude = f(0), f(0)
	if errs := in.Validate(); len(errs) != 0 {
		t.Fatalf("0,0 should be valid: %v", errs)
	}
}

func TestAllListedTypesAreValid(t *testing.T) {
	for _, typ := range Types {
		in := valid()
		in.Type = typ
		if errs := in.Validate(); len(errs) != 0 {
			t.Errorf("%s: %v", typ, errs)
		}
	}
	if len(Types) != 14 {
		t.Errorf("unexpected number of types: %d", len(Types))
	}
}

func TestMigrateLegacyType(t *testing.T) {
	if MigrateLegacyType("vehicle") != "car" || MigrateLegacyType("truck") != "truck" {
		t.Fatal("legacy migration wrong")
	}
}

func TestNormalize(t *testing.T) {
	in := valid()
	in.Name = "   "
	in.Normalize()
	if _, ok := in.Validate()["name"]; !ok {
		t.Fatal("whitespace-only name must be rejected")
	}
}
