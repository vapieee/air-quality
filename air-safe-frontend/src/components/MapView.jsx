import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

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

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();

      if (selectedLocation) {
        map.flyTo(
          [selectedLocation.lat, selectedLocation.lng],
          15,
          {
            duration: 1,
          }
        );
      }
    }, 200);

    return () => window.clearTimeout(resizeTimer);
  }, [map, selectedLocation]);

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
      center={[13.6218, 123.1948]}
      zoom={14}
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