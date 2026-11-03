package main

import (
	"log"

	"github.com/example/geo-entity-manager/backend/internal/entity"
	"github.com/example/geo-entity-manager/backend/internal/store"
)

func fp(v float64) *float64 { return &v }

func seedIfEmpty(s store.Store) {
	if s.Count() > 0 {
		return
	}
	samples := []entity.Input{
		{Name: "Truk Box B 9021 XY", Type: "truck", Status: "active", Latitude: fp(-6.1754), Longitude: fp(106.8272), Description: "Delivery truck, Monas area."},
		{Name: "Bus Shuttle Karyawan 03", Type: "bus", Status: "active", Latitude: fp(-6.2297), Longitude: fp(106.8295), Description: "Employee shuttle, Kuningan route."},
		{Name: "Mobil Servis B 1544 KLM", Type: "car", Status: "maintenance", Latitude: fp(-6.2146), Longitude: fp(106.8187), Description: "Under routine maintenance."},
		{Name: "Motor Kurir 12", Type: "motorcycle", Status: "active", Latitude: fp(-6.2615), Longitude: fp(106.7810), Description: "Last-mile courier, Kebayoran."},
		{Name: "Sensor Suhu GBK", Type: "sensor", Status: "active", Latitude: fp(-6.2188), Longitude: fp(106.8017), Description: "Monitors temperature and humidity."},
		{Name: "Gateway LoRa Kemayoran", Type: "gateway", Status: "inactive", Latitude: fp(-6.1636), Longitude: fp(106.8458), Description: "Offline since last week."},
		{Name: "CCTV Persimpangan Semanggi", Type: "camera", Status: "active", Latitude: fp(-6.2185), Longitude: fp(106.8130), Description: "Traffic camera, north-facing."},
		{Name: "GPS Tracker Kontainer 77", Type: "gps_tracker", Status: "active", Latitude: fp(-6.1070), Longitude: fp(106.8800), Description: "Container tracker, Tanjung Priok."},
		{Name: "Gudang Cakung", Type: "warehouse", Status: "active", Latitude: fp(-6.1808), Longitude: fp(106.9406), Description: "Eastern distribution hub."},
		{Name: "Kantor Pusat Sudirman", Type: "office", Status: "active", Latitude: fp(-6.2088), Longitude: fp(106.8200), Description: "Head office."},
		{Name: "Pabrik Pulogadung", Type: "factory", Status: "maintenance", Latitude: fp(-6.1930), Longitude: fp(106.9060), Description: "Line 2 shut down for service."},
		{Name: "SPBU Pertamina Gatot Subroto", Type: "gas_station", Status: "active", Latitude: fp(-6.2350), Longitude: fp(106.8250), Description: "Fleet refuelling point."},
		{Name: "SPKLU Grand Indonesia", Type: "charging_station", Status: "inactive", Latitude: fp(-6.1950), Longitude: fp(106.8210), Description: "EV charger, out of service."},
		{Name: "Pos Pantau Ancol", Type: "other", Status: "inactive", Latitude: fp(-6.1260), Longitude: fp(106.8330), Description: "Temporary monitoring point."},
	}
	for _, in := range samples {
		if _, err := s.Create(in); err != nil {
			log.Printf("seed failed: %v", err)
			return
		}
	}
	log.Printf("seeded %d sample entities", len(samples))
}
