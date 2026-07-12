import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// top of file, outside the component
const DEFAULT_CENTER = [13.6218, 123.1948];
const DEFAULT_ZOOM = 14;

function getAQIColor(aqi) {
  if (aqi <= 50) return "#2ecc71";
  if (aqi <= 100) return "#f1c40f";
  if (aqi <= 150) return "#f39c12";
  if (aqi <= 200) return "#e74c3c";
  if (aqi <= 300) return "#9b59b6";
  return "#7b241c";
}

function getAQIIntensity(aqi) {
  return Math.min(Math.max(aqi / 300, 0.15), 1);
}

function createAQIMarker(location, isSelected) {
  const color = getAQIColor(location.aqi);

  return L.divIcon({
    className: "aqi-marker-wrapper",
    html: `
      <div
        class="aqi-map-marker ${isSelected ? "selected" : ""}"
        style="
          --marker-color: ${color};
          --marker-glow: ${color}66;
        "
      >
        <span>${location.aqi}</span>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function MapController({ selectedLocation }) {
  const map = useMap();
  const prevIdRef = useRef(null);

  // Handles container resize only — runs once on mount
  useEffect(() => {
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => window.clearTimeout(resizeTimer);
  }, [map]);

  // Handles flying to a location — only when the SELECTED ID changes
  useEffect(() => {
    if (!selectedLocation) {
      prevIdRef.current = null;
      return;
    }
    console.log("prevId:", prevIdRef.current, "newId:", selectedLocation.id); // TEMP DEBUG


    if (prevIdRef.current !== selectedLocation.id) {
      prevIdRef.current = selectedLocation.id;

      const currentZoom = map.getZoom();
      const targetZoom = Math.max(currentZoom, 15);

      map.flyTo(
        [selectedLocation.lat, selectedLocation.lng],
        targetZoom,
        { duration: 1 }
      );
    }
  }, [map, selectedLocation?.id, selectedLocation?.lat, selectedLocation?.lng]);

  return null;
}

function HeatmapLayer({ locations, visible }) {
  const map = useMap();

  const heatPoints = useMemo(
    () =>
      locations.map((location) => [
        location.lat,
        location.lng,
        getAQIIntensity(location.aqi),
      ]),
    [locations]
  );

  useEffect(() => {
    if (!visible || !L.heatLayer) {
      return undefined;
    }

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 42,
      blur: 32,
      maxZoom: 17,
      minOpacity: 0.35,
      gradient: {
        0.2: "#2ecc71",
        0.4: "#f1c40f",
        0.6: "#f39c12",
        0.8: "#e74c3c",
        1: "#7b241c",
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatPoints, visible]);

  return null;
}

function MapView({
  locations,
  selectedLocation,
  onSelectLocation,
  mapMode,
}) {
  const showMarkers = mapMode === "markers" || mapMode === "both";
  const showHeatmap = mapMode === "heatmap" || mapMode === "both";

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="map"
    >
      <MapController selectedLocation={selectedLocation} />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <HeatmapLayer
        locations={locations}
        visible={showHeatmap}
      />

      {showMarkers &&
        locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.lat, location.lng]}
            icon={createAQIMarker(
              location,
              selectedLocation?.id === location.id
            )}
            eventHandlers={{
              click: () => onSelectLocation(location),
            }}
          >
            <Popup>
              <div className="map-popup">
                <span className="map-popup-label">
                  Monitoring Location
                </span>

                <h3>{location.name}</h3>
                <p>{location.city}</p>

                <div className="map-popup-aqi">
                  <span>AQI</span>
                  <strong>{location.aqi}</strong>
                </div>

                <div className="map-popup-status">
                  {location.status}
                </div>

                <button
                  type="button"
                  className="map-popup-button"
                  onClick={() => onSelectLocation(location)}
                >
                  View Complete Readings
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}

export default MapView;