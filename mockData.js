'use strict';

const mockData = {
  "eiffel tower, paris, france": {
    lat: 48.8584, lng: 2.2945,
    formatted: "Eiffel Tower, Champ de Mars, 5 Av. Anatole France, 75007 Paris, France",
    confidence: 10
  },
  "times square, new york": {
    lat: 40.7580, lng: -73.9855,
    formatted: "Times Square, Manhattan, New York, NY 10036, United States",
    confidence: 10
  },
  "big ben, london": {
    lat: 51.5007, lng: -0.1246,
    formatted: "Big Ben, Westminster Bridge Rd, London SW1A 2JH, United Kingdom",
    confidence: 10
  },
  "sydney opera house, australia": {
    lat: -33.8568, lng: 151.2153,
    formatted: "Sydney Opera House, Bennelong Point, Sydney NSW 2000, Australia",
    confidence: 10
  },
  "tokyo tower, japan": {
    lat: 35.6586, lng: 139.7454,
    formatted: "Tokyo Tower, 4 Chome-2-8 Shibakoen, Minato City, Tokyo 105-0011, Japan",
    confidence: 10
  },
  "colosseum, rome, italy": {
    lat: 41.8902, lng: 12.4922,
    formatted: "Colosseum, Piazza del Colosseo, 1, 00184 Roma RM, Italy",
    confidence: 10
  },
  "statue of liberty, new york": {
    lat: 40.6892, lng: -74.0445,
    formatted: "Statue of Liberty, Liberty Island, New York, NY 10004, United States",
    confidence: 10
  },
  "sagrada familia, barcelona, spain": {
    lat: 41.4036, lng: 2.1744,
    formatted: "Sagrada Família, Carrer de Mallorca, 401, 08013 Barcelona, Spain",
    confidence: 10
  },
  "burj khalifa, dubai": {
    lat: 25.1972, lng: 55.2744,
    formatted: "Burj Khalifa, 1 Sheikh Mohammed bin Rashid Blvd, Dubai, United Arab Emirates",
    confidence: 10
  },
  "great wall of china": {
    lat: 40.4319, lng: 116.5704,
    formatted: "Great Wall of China, Huairou District, Beijing, China",
    confidence: 10
  },
  "1600 pennsylvania ave nw, washington dc": {
    lat: 38.8976763, lng: -77.0365298,
    formatted: "1600 Pennsylvania Avenue NW, Washington, DC 20500, United States",
    confidence: 10
  }
};

function normalize(address) {
  return address.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getMockGeocode(address) {
  const key = normalize(address);
  if (mockData[key]) return mockData[key];
  // Generate plausible coordinates from string hash for unknown addresses
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  const lat = ((hash & 0xFFFF) / 0xFFFF) * 180 - 90;
  const lng = (((hash >> 16) & 0xFFFF) / 0xFFFF) * 360 - 180;
  return {
    lat: parseFloat(lat.toFixed(7)),
    lng: parseFloat(lng.toFixed(7)),
    formatted: address,
    confidence: 3
  };
}

function getMockReverse(lat, lng) {
  // Find closest mock entry
  let closest = null;
  let minDist = Infinity;
  for (const [key, data] of Object.entries(mockData)) {
    const dist = Math.sqrt(Math.pow(data.lat - lat, 2) + Math.pow(data.lng - lng, 2));
    if (dist < minDist) { minDist = dist; closest = data; }
  }
  if (closest && minDist < 1) {
    return { formatted: closest.formatted, city: extractCity(closest.formatted), state: extractState(closest.formatted), country: extractCountry(closest.formatted), country_code: extractCountryCode(closest.formatted) };
  }
  return { formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, city: "Unknown", state: "Unknown", country: "Unknown", country_code: "XX" };
}

function extractCity(formatted) {
  const parts = formatted.split(',');
  return parts.length >= 2 ? parts[parts.length - 3]?.trim() || "Unknown" : "Unknown";
}
function extractState(formatted) {
  const parts = formatted.split(',');
  return parts.length >= 2 ? parts[parts.length - 2]?.trim() || "Unknown" : "Unknown";
}
function extractCountry(formatted) {
  const parts = formatted.split(',');
  return parts[parts.length - 1]?.trim() || "Unknown";
}
function extractCountryCode(formatted) {
  const countryMap = { "United States": "US", "France": "FR", "United Kingdom": "GB", "Australia": "AU", "Japan": "JP", "Italy": "IT", "Spain": "ES", "United Arab Emirates": "AE", "China": "CN" };
  const country = extractCountry(formatted);
  return countryMap[country] || "XX";
}

module.exports = { normalize, getMockGeocode, getMockReverse };
