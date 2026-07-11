import TrendChart from "./TrendChart";

function ForecastPanel({ forecast }) {
  if (!forecast || forecast.length === 0) {
    return (
      <section className="forecast-panel">
        <div className="forecast-heading">
          <h4>Forecast</h4>
          <p>Predictions every 3 hours</p>
        </div>

        <div className="forecast-empty">
          No forecast data is available for this monitoring location.
        </div>
      </section>
    );
  }

  return (
    <section className="forecast-panel">
      <div className="forecast-heading">
        <h4>Forecast</h4>
        <p>Predictions every 3 hours</p>
      </div>

      <div className="forecast-summary">
        {forecast.map((item) => (
          <div className="forecast-summary-card" key={item.time}>
            <span>{item.time}</span>
            <strong>{item.aqi}</strong>
            <small>AQI</small>
          </div>
        ))}
      </div>

      <TrendChart
        title="AQI Trend"
        data={forecast}
        dataKey="aqi"
        color="#f39c12"
      />

      <TrendChart
        title="PM2.5"
        data={forecast}
        dataKey="pm25"
        color="#f5a623"
        unit=" µg/m³"
      />

      <TrendChart
        title="CO"
        data={forecast}
        dataKey="co"
        color="#47b04b"
        unit=" ppm"
        decimals={1}
      />

      <TrendChart
        title="NO₂"
        data={forecast}
        dataKey="no2"
        color="#4da3ff"
        unit=" µg/m³"
      />
    </section>
  );
}

export default ForecastPanel;