import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { locations, subscribe } from "./data/Data";

import MapView from "./components/MapView";
import AQILegend from "./components/AQILegend";
import MapControls from "./components/MapControls";
import ReadingCard from "./components/ReadingCard";
import ForecastPanel from "./components/ForecastPanel";

function App() {
  const [mapLocations, setMapLocations] = useState([...locations]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [mapMode, setMapMode] = useState("markers");

  useEffect(() => {
    const unsubscribe = subscribe((newLocations) => {
      setMapLocations([...newLocations]);
    });

    return unsubscribe;
  }, []);

  const selectedLocation = useMemo(() => {
    return (
      mapLocations.find((loc) => loc.id === selectedLocationId) || null
    );
  }, [mapLocations, selectedLocationId]);

  const getAQIColor = (aqi) => {
    if (aqi <= 50) {
      return { color: "#2ECC71", bg: "#EAF8EF" };
    }

    if (aqi <= 100) {
      return { color: "#F1C40F", bg: "#FFFBEA" };
    }

    if (aqi <= 150) {
      return { color: "#F39C12", bg: "#FFF4E5" };
    }

    if (aqi <= 200) {
      return { color: "#E74C3C", bg: "#FDECEC" };
    }

    if (aqi <= 300) {
      return { color: "#8E44AD", bg: "#F5ECFA" };
    }

    return { color: "#7B241C", bg: "#F8EAEA" };
  };

  const aqiStyle = selectedLocation
    ? getAQIColor(selectedLocation.aqi)
    : { color: "#F39C12", bg: "#FFF4E5" };

  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="logo">● AIR-SAFE</div>

        <div className="status">
          ● LIVE —{" "}
          {selectedLocation
            ? `${selectedLocation.name}, ${selectedLocation.city}`
            : "Naga City, Camarines Sur"}
        </div>
      </header>

      <main className="content">
        <section className="map-panel">
          <MapControls
            mapMode={mapMode}
            setMapMode={setMapMode}
          />

          <MapView
            locations={mapLocations}
            selectedLocation={selectedLocation}
            onSelectLocation={(location) =>
              setSelectedLocationId(location.id)
            }
            mapMode={mapMode}
          />

          <AQILegend />
        </section>

        {selectedLocation && (
          <aside className="side-panel">
            <button
              type="button"
              className="close-btn"
              onClick={() => setSelectedLocationId(null)}
            >
              ×
            </button>

            <div className="sidebar-header">
              <h2>{selectedLocation.name}</h2>

              <p>{selectedLocation.city}</p>
              <small>
                Updated:{" "}
                {selectedLocation.timestamp
                  ? new Date(selectedLocation.timestamp).toLocaleString()
                  : "No Data"}
              </small>
            </div>

            <div className="aqi-summary-card">
              <div
                className="aqi-circle"
                style={{
                  borderColor: aqiStyle.color,
                  color: aqiStyle.color,
                  background: aqiStyle.bg,
                }}
              >
                {selectedLocation.aqi}
              </div>

              <div className="aqi-text">
                <span>AQI</span>

                <h3>{selectedLocation.status}</h3>

                <p>
                  Some pollutants may affect sensitive
                  individuals.
                </p>
              </div>
            </div>

            <div className="recommendation-box">
              <h4>Health Recommendation</h4>

              <p>
                Sensitive individuals should reduce
                prolonged outdoor exposure. General public
                may continue normal activities.
              </p>
            </div>

            <h4 className="section-title">
              Current Readings
            </h4>

            <div className="readings">
              <ReadingCard
                title="PM2.5"
                value={selectedLocation.pm25}
                unit="µg/m³"
                color="#F5A623"
              />

              <ReadingCard
                title="CO"
                value={selectedLocation.co}
                unit="ppm"
                color="#47B04B"
              />

              <ReadingCard
                title="NO₂"
                value={selectedLocation.no2}
                unit="ppm"
                color="#4DA3FF"
              />

              <ReadingCard
                title="Temperature"
                value={selectedLocation.temperature}
                unit="°C"
                color="#FF6B6B"
              />

            <ReadingCard
                title="Humidity"
                value={selectedLocation.humidity}
                unit="%"
                color="#53C7F0"
              />

              <ReadingCard
                title="AQI"
                value={selectedLocation.aqi}
                unit="US EPA"
                color="#8E6BFF"
              />
            </div>

            <ForecastPanel
              forecast={selectedLocation.forecast}
            />
          </aside>
        )}
      </main>
    </div>
  );
}

export default App;