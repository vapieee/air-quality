const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:8000";

export let locations = [];

const listeners = [];

// API functions to fetch data from the backend    
async function fetchStations() {
  const response = await fetch(`${BASE_URL}/monitor/stations`);

  if (!response.ok) {
    throw new Error("Failed to fetch stations");
  }

  return response.json();
}

async function fetchCurrentData(stationId) {
  const response = await fetch(`${BASE_URL}/monitor/read/${stationId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch current data for station ${stationId}`);
  }

  return response.json();
}

async function fetchForecastData(stationId) {
  const response = await fetch(`${BASE_URL}/monitor/forecast/${stationId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch forecast data for station ${stationId}`);
  }

  return response.json();
}

// Helper functions to convert API data into a more usable format
function componentsToObject(components = []) {
  const obj = {};

  for (const component of components) {
    obj[component.name] = component.value;
  }

  return obj;
}

function buildForecast(now, forecast) {
  const h1 = componentsToObject(forecast.next_first_hour);
  const h2 = componentsToObject(forecast.next_second_hour);
  const h3 = componentsToObject(forecast.next_third_hour);

  return [
    {
      time: "Now",
      aqi: now.aqi,
      pm25: now.pm25_ugm3,
      co: now.co_ppm,
      no2: now.no2_ppm,
      temperature: now.temp_c,
      humidity: now.humidity_pct,
    },
    {
      time: "+1h",
      aqi: h1.aqi,
      pm25: h1.pm25_ugm3,
      co: h1.co_ppm,
      no2: h1.no2_ppm,
      temperature: h1.temp_c,
      humidity: h1.humidity_pct,
    },
    {
      time: "+2h",
      aqi: h2.aqi,
      pm25: h2.pm25_ugm3,
      co: h2.co_ppm,
      no2: h2.no2_ppm,
      temperature: h2.temp_c,
      humidity: h2.humidity_pct,
    },
    {
      time: "+3h",
      aqi: h3.aqi,
      pm25: h3.pm25_ugm3,
      co: h3.co_ppm,
      no2: h3.no2_ppm,
      temperature: h3.temp_c,
      humidity: h3.humidity_pct,
    },
  ];
}

// Fetch all stations and their current and forecast data, returning an array of location objects
async function getLocations() {
  const stations = await fetchStations();

  return Promise.all(
    stations.map(async (station) => {
      const [current, forecast] = await Promise.all([
        fetchCurrentData(station.station_id),
        fetchForecastData(station.station_id),
      ]);

      const now = componentsToObject(current.components);

      return {
        id: Number(station.station_id),
        name: station.name,
        city: station.city,
        lat: station.latitude,
        lng: station.longitude,

        timestamp: current.timestamp,

        status: current.status,
        aqi: now.aqi,

        pm25: now.pm25_ugm3,
        co: now.co_ppm,
        no2: now.no2_ppm,
        temperature: now.temp_c,
        humidity: now.humidity_pct,

        forecast: buildForecast(now, forecast.forecast),
      };
    })
  );
}

// Update locations array and notify subscribers every 5 seconds
async function refreshLocations() {
  try {
    const data = await getLocations();

    // keep same array reference
    locations.splice(0, locations.length, ...data);

    // notify subscribers
    listeners.forEach((listener) => listener(locations));

    console.log(
      `Updated ${locations.length} stations @ ${new Date().toLocaleTimeString()}`
    );
  } catch (err) {
    console.error(err);
  }
}

// Subscribe to location updates     

export function subscribe(callback) {
  listeners.push(callback);

  // send current data immediately if available
  callback(locations);

  return () => {
    const index = listeners.indexOf(callback);

    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
}

// Start looping to refresh locations every 5 seconds      

await refreshLocations();

setInterval(refreshLocations, 5000);