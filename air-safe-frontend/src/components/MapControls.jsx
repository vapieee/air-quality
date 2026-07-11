function MapControls({ mapMode, setMapMode }) {
  return (
    <div className="map-controls">
      <button
        type="button"
        className={mapMode === "markers" ? "active" : ""}
        onClick={() => setMapMode("markers")}
      >
        Markers
      </button>

      <button
        type="button"
        className={mapMode === "heatmap" ? "active" : ""}
        onClick={() => setMapMode("heatmap")}
      >
        Heatmap
      </button>

      <button
        type="button"
        className={mapMode === "both" ? "active" : ""}
        onClick={() => setMapMode("both")}
      >
        Both
      </button>
    </div>
  );
}

export default MapControls;