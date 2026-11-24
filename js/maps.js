/* Shared map helpers (used by Find a Room and Post a Room). */
"use strict";

// True if the Leaflet map library loaded (it needs internet).
const mapsAvailable = () => typeof L !== "undefined";

// Adds the OpenStreetMap picture tiles to a map.
// The school marker: a dark rounded badge with a graduation cap (instead of the blue pin)
function schoolIcon() {
  return L.divIcon({ className: "school-pin", html: "🎓", iconSize: [44, 32], iconAnchor: [22, 16] });
}

function addTiles(map) {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}
