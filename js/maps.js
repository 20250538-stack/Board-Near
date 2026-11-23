/* Shared map helpers (used by Find a Room and Post a Room). */
"use strict";

const mapsAvailable = () => typeof L !== "undefined";

function addTiles(map) {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
}
