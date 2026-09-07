const BASE_URL = "https://airsafe.duckdns.org";

// Convert HTTPS URL to WebSocket URL.
const WS_URL = BASE_URL.replace(/^http/, "ws");

export let locations = [];

const listeners = [];

const readSockets = new Map();
const forecastSockets = new Map();

// Exponential backoff state, per station + channel, so a broken
// endpoint doesn't get hammered every 3 seconds forever.
const readReconnectDelays = new Map();
const forecastReconnectDelays = new Map();

const MIN_RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_DELAY_MS = 30000;

function nextReconnectDelay(delaysMap, stationId) {
  const current =
    delaysMap.get(stationId) ?? MIN_RECONNECT_DELAY_MS;

  const next = Math.min(
    current * 2,
    MAX_RECONNECT_DELAY_MS
  );

  delaysMap.set(stationId, next);

  return current;
}

function resetReconnectDelay(delaysMap, stationId) {
  delaysMap.set(stationId, MIN_RECONNECT_DELAY_MS);
}


// HTTP FUNCTIONS

// Stations are fetched only when needed.
async function fetchStations() {
  const response = await fetch(
    `${BASE_URL}/monitor/stations`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch stations");
  }

  return response.json();
}

async function fetchLatestReading(stationId) {
  const response = await fetch(
    `${BASE_URL}/monitor/read/${stationId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch latest reading for station ${stationId}`
    );
  }

  return response.json();
}

async function fetchLatestForecast(stationId) {
  const response = await fetch(
    `${BASE_URL}/monitor/forecast/${stationId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch latest forecast for station ${stationId}`
    );
  }

  return response.json();
}

// History is fetched only when requested.
export async function fetchHistoricalData(stationId) {
  const response = await fetch(
    `${BASE_URL}/monitor/history/${stationId}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch historical data for station ${stationId}`
    );
  }

  return response.json();
}


// HELPERS

function componentsToObject(components = []) {
  const obj = {};

  for (const component of components) {
    obj[component.name] = component.value;
  }

  return obj;
}


function buildForecast(now, forecast = {}) {
  const h1 = componentsToObject(
    forecast.next_first_hour
  );

  const h2 = componentsToObject(
    forecast.next_second_hour
  );

  const h3 = componentsToObject(
    forecast.next_third_hour
  );

  return [
    {
      time: "Now",

      aqi: now.aqi,

      pm25: now.pm25_ugm3,

      co: now.co_ugm3,

      no2: now.no2_ugm3,

      temperature: now.temp_c,

      humidity: now.humidity_pct,
    },

    {
      time: "+1h",

      aqi: h1.aqi,

      pm25: h1.pm25_ugm3,

      co: h1.co_ugm3,

      no2: h1.no2_ugm3,

      temperature: h1.temp_c,

      humidity: h1.humidity_pct,
    },

    {
      time: "+2h",

      aqi: h2.aqi,

      pm25: h2.pm25_ugm3,

      co: h2.co_ugm3,

      no2: h2.no2_ugm3,

      temperature: h2.temp_c,

      humidity: h2.humidity_pct,
    },

    {
      time: "+3h",

      aqi: h3.aqi,

      pm25: h3.pm25_ugm3,

      co: h3.co_ugm3,

      no2: h3.no2_ugm3,

      temperature: h3.temp_c,

      humidity: h3.humidity_pct,
    },
  ];
}


// FIND LOCATION

function findLocation(stationId) {
  return locations.find(
    (location) =>
      Number(location.id) === Number(stationId)
  );
}


// NOTIFY REACT COMPONENTS

function notifyListeners() {
  listeners.forEach((listener) => {
    listener(locations);
  });
}


// APPLY CURRENT READING

function applyReading(stationId, reading) {
  const location = findLocation(stationId);

  if (!location) {
    console.warn(
      `Received reading for unknown station ${stationId}`
    );
    return;
  }

  // Convert backend "components" array into an object.
  const components = componentsToObject(
    reading.components || []
  );

  location.timestamp = reading.timestamp;
  location.status = reading.status;

  location.aqi = components.aqi ?? null;
  location.pm25 = components.pm25_ugm3 ?? null;
  location.co = components.co_ugm3 ?? null;
  location.no2 = components.no2_ugm3 ?? null;
  location.temperature = components.temp_c ?? null;
  location.humidity = components.humidity_pct ?? null;

  // Update "Now" in forecast if it already exists.
  if (
    Array.isArray(location.forecast) &&
    location.forecast.length > 0
  ) {
    location.forecast[0] = {
      time: "Now",
      aqi: components.aqi ?? null,
      pm25: components.pm25_ugm3 ?? null,
      co: components.co_ugm3 ?? null,
      no2: components.no2 ?? null,
      temperature: components.temp_c ?? null,
      humidity: components.humidity_pct ?? null,
    };
  }

  notifyListeners();
}


// APPLY FORECAST

function applyForecast(
  stationId,
  forecastData
) {
  const location = findLocation(
    stationId
  );

  if (!location) {
    console.warn(
      `Received forecast for unknown station ${stationId}`
    );

    return;
  }

  const now = {
    aqi: location.aqi,

    pm25_ugm3:
      location.pm25,

    co_ugm3:
      location.co,

    no2_ugm3:
      location.no2,

    temp_c:
      location.temperature,

    humidity_pct:
      location.humidity,
  };

  location.forecast =
    buildForecast(
      now,
      forecastData.forecast
    );

  notifyListeners();
}


// READ WEBSOCKET

function connectReadSocket(
  stationId
) {
  stationId = String(stationId);

  // Prevent duplicate connections.
  if (
    readSockets.has(stationId)
  ) {
    return;
  }

  const socket = new WebSocket(
    `${WS_URL}/monitor/read/${stationId}`
  );

  readSockets.set(
    stationId,
    socket
  );

  socket.onopen = () => {
    console.log(
      `[WS] READ connected: station ${stationId}`
    );

    resetReconnectDelay(
      readReconnectDelays,
      stationId
    );
  };
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
  
      console.log(
        `[WS] New reading for station ${stationId}:`,
        data
      );
  
      const components = {};
  
      for (const component of data.components || []) {
        components[component.name] =
          component.value;
      }
  
      const location = locations.find(
        location =>
          Number(location.id) ===
          Number(data.station_id)
      );
  
      if (!location) {
        return;
      }
  
      location.timestamp =
        data.timestamp;
  
      location.status =
        data.status;
  
      location.aqi =
        components.aqi ?? null;
  
      location.pm25 =
        components.pm25_ugm3 ?? null;
  
      location.co =
        components.co_ugm3 ?? null;
  
      location.no2 =
        components.no2_ugm3 ?? null;
  
      location.temperature =
        components.temp_c ?? null;
  
      location.humidity =
        components.humidity_pct ?? null;
  
      notifyListeners();
  
    } catch (error) {
  
      console.error(
        "[WS] Invalid reading:",
        error
      );
    }
  };

  socket.onerror = (error) => {
    console.error(
      `[WS] READ error: station ${stationId}`,
      error
    );
  };

  socket.onclose = (event) => {

    console.log(
      `[WS] READ closed: station ${stationId} ` +
      `(code ${event.code}${event.reason ? `, reason: ${event.reason}` : ""})`
    );

    readSockets.delete(
      stationId
    );

    // Automatically reconnect, backing off if it keeps failing.
    const delay = nextReconnectDelay(
      readReconnectDelays,
      stationId
    );

    setTimeout(() => {

      if (
        !readSockets.has(stationId)
      ) {
        connectReadSocket(
          stationId
        );
      }

    }, delay);
  };
}


// FORECAST WEBSOCKET

function connectForecastSocket(
  stationId
) {
  stationId = String(stationId);

  // Prevent duplicate connections.
  if (
    forecastSockets.has(stationId)
  ) {
    return;
  }

  const socket = new WebSocket(
    `${WS_URL}/monitor/forecast/${stationId}`
  );

  forecastSockets.set(
    stationId,
    socket
  );

  socket.onopen = () => {
    console.log(
      `[WS] FORECAST connected: station ${stationId}`
    );

    resetReconnectDelay(
      forecastReconnectDelays,
      stationId
    );
  };
  socket.onmessage = (event) => {
    try {
  
      const data =
        JSON.parse(event.data);
  
      console.log(
        `[WS] New forecast for station ${stationId}:`,
        data
      );
  
      const location = locations.find(
        location =>
          Number(location.id) ===
          Number(data.station_id)
      );
  
      if (!location) {
        return;
      }
  
      const forecast =
        data.forecast || {};
  
      function convertComponents(
        components
      ) {
  
        const values = {};
  
        for (
          const component
          of components || []
        ) {
          values[component.name] =
            component.value;
        }
  
        return values;
      }
  
      const h1 =
        convertComponents(
          forecast.next_first_hour
        );
  
      const h2 =
        convertComponents(
          forecast.next_second_hour
        );
  
      const h3 =
        convertComponents(
          forecast.next_third_hour
        );
  
      location.forecast = [
  
        {
          time: "Now",
  
          aqi: location.aqi,
  
          pm25: location.pm25,
  
          co: location.co,
  
          no2: location.no2,
  
          temperature:
            location.temperature,
  
          humidity:
            location.humidity,
        },
  
        {
          time: "+1h",
  
          aqi: h1.aqi ?? null,
  
          pm25:
            h1.pm25_ugm3 ?? null,
  
          co:
            h1.co_ugm3 ?? null,
  
          no2:
            h1.no2_ugm3 ?? null,
  
          temperature:
            h1.temp_c ?? null,
  
          humidity:
            h1.humidity_pct ?? null,
        },
  
        {
          time: "+2h",
  
          aqi: h2.aqi ?? null,
  
          pm25:
            h2.pm25_ugm3 ?? null,
  
          co:
            h2.co_ugm3 ?? null,
  
          no2:
            h2.no2_ugm3 ?? null,
  
          temperature:
            h2.temp_c ?? null,
  
          humidity:
            h2.humidity_pct ?? null,
        },
  
        {
          time: "+3h",
  
          aqi: h3.aqi ?? null,
  
          pm25:
            h3.pm25_ugm3 ?? null,
  
          co:
            h3.co_ugm3 ?? null,
  
          no2:
            h3.no2_ugm3 ?? null,
  
          temperature:
            h3.temp_c ?? null,
  
          humidity:
            h3.humidity_pct ?? null,
        },
      ];
  
      notifyListeners();
  
    } catch (error) {
  
      console.error(
        "[WS] Invalid forecast:",
        error
      );
    }
  };

  socket.onerror = (error) => {
    console.error(
      `[WS] FORECAST error: station ${stationId}`,
      error
    );
  };

  socket.onclose = (event) => {

    console.log(
      `[WS] FORECAST closed: station ${stationId} ` +
      `(code ${event.code}${event.reason ? `, reason: ${event.reason}` : ""})`
    );

    forecastSockets.delete(
      stationId
    );

    // Automatically reconnect, backing off if it keeps failing.
    const delay = nextReconnectDelay(
      forecastReconnectDelays,
      stationId
    );

    setTimeout(() => {

      if (
        !forecastSockets.has(
          stationId
        )
      ) {
        connectForecastSocket(
          stationId
        );
      }

    }, delay);
  };
}


// INITIALIZE STATIONS

async function initializeLocations() {

  try {

    const stations =
      await fetchStations();

    locations.splice(
      0,
      locations.length
    );

    for (const station of stations) {

      locations.push({
        id: Number(station.station_id),
        name: station.name,
        city: station.city,
        lat: station.latitude,
        lng: station.longitude,
    
        timestamp: null,
        status: "No Data",
        aqi: null,
        pm25: null,
        co: null,
        no2: null,
        temperature: null,
        humidity: null,
    
        forecast: [
          {
            time: "Now",
            aqi: null,
            pm25: null,
            co: null,
            no2: null,
            temperature: null,
            humidity: null,
          },
          {
            time: "+1h",
            aqi: null,
            pm25: null,
            co: null,
            no2: null,
            temperature: null,
            humidity: null,
          },
          {
            time: "+2h",
            aqi: null,
            pm25: null,
            co: null,
            no2: null,
            temperature: null,
            humidity: null,
          },
          {
            time: "+3h",
            aqi: null,
            pm25: null,
            co: null,
            no2: null,
            temperature: null,
            humidity: null,
          },
        ],
      });
    
      // Get latest data from DB first.
      try {
        const reading = await fetchLatestReading(
          station.station_id
        );
    
        console.log(
          `[HTTP] Latest reading for station ${station.station_id}:`,
          reading
        );
    
        applyReading(
          station.station_id,
          reading
        );
      } catch (error) {
        console.error(
          `[HTTP] Failed to load reading for station ${station.station_id}:`,
          error
        );
      }
    
      try {
        const forecast = await fetchLatestForecast(
          station.station_id
        );
    
        console.log(
          `[HTTP] Latest forecast for station ${station.station_id}:`,
          forecast
        );
    
        applyForecast(
          station.station_id,
          forecast
        );
      } catch (error) {
        console.error(
          `[HTTP] Failed to load forecast for station ${station.station_id}:`,
          error
        );
      }
    
      // Then open WebSockets for future updates.
      connectReadSocket(station.station_id);
      connectForecastSocket(station.station_id);
    }

    notifyListeners();

    console.log(
      `Loaded ${locations.length} stations`
    );

  } catch (error) {

    console.error(
      "Failed to initialize stations:",
      error
    );
  }
}


// REFRESH STATIONS
//
// This is NOT automatic polling.
//
// If station configuration changes,
// you can explicitly call:
//
//     refreshStations()
//

export async function refreshStations() {
  await initializeLocations();
}


// SUBSCRIBE

export function subscribe(
  callback
) {

  listeners.push(
    callback
  );

  // Give current state immediately.
  callback(
    locations
  );

  return () => {

    const index =
      listeners.indexOf(
        callback
      );

    if (
      index !== -1
    ) {
      listeners.splice(
        index,
        1
      );
    }
  };
}


// CLOSE ALL SOCKETS

export function closeConnections() {

  for (
    const socket
    of readSockets.values()
  ) {

    socket.close();
  }

  for (
    const socket
    of forecastSockets.values()
  ) {

    socket.close();
  }

  readSockets.clear();

  forecastSockets.clear();
}


// INITIAL START

await initializeLocations();