function AQILegend() {
  return (
    <div className="aqi-legend">
      <h4>AQI Index</h4>

      <div>
        <span className="dot good"></span>
        Good (0–50)
      </div>

      <div>
        <span className="dot moderate"></span>
        Moderate (51–100)
      </div>

      <div>
        <span className="dot sensitive"></span>
        Unhealthy for Sensitive Groups (101–150)
      </div>

      <div>
        <span className="dot unhealthy"></span>
        Unhealthy (151–200)
      </div>

      <div>
        <span className="dot very-unhealthy"></span>
        Very Unhealthy (201–300)
      </div>

      <div>
        <span className="dot hazardous"></span>
        Hazardous (301+)
      </div>
    </div>
  );
}

export default AQILegend;