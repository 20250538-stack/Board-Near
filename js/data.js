/* Saved data (rooms, favorites, messages) and distance/photo helpers. */
"use strict";

// Old versions saved map positions as x/y "pixels" on a drawing.
// Convert those to real coordinates once, so old listings still work.
const GRID_STEP = 0.000036, GRID_CX = 300, GRID_CY = 260;
function migrateRoom(room) {
  if (room.lat == null && room.x != null) {
    room.lat = SCHOOL.lat - (room.y - GRID_CY) * GRID_STEP;
    room.lng = SCHOOL.lng + (room.x - GRID_CX) * GRID_STEP;
  }
  delete room.x;
  delete room.y;
  return room;
}

let rooms = store.get("bn-user", []).map(migrateRoom);
let favs = new Set(store.get("bn-favs", []));
let msgs = store.get("bn-msgs", []);

const saveRooms = () => store.set("bn-user", rooms);
const saveFavs = () => store.set("bn-favs", [...favs]);
const saveMsgs = () => store.set("bn-msgs", msgs);

// Straight-line distance to the school in metres (haversine), rounded to 10 m
function metersFromSchool(lat, lng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat - SCHOOL.lat) * rad, dLng = (lng - SCHOOL.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(SCHOOL.lat * rad) * Math.cos(lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round((2 * R * Math.asin(Math.sqrt(a))) / 10) * 10;
}
const away = room => metersFromSchool(room.lat, room.lng);
const coords = room => [room.lat, room.lng];

function photoStyle(room, i = room.id) {
  if (room.photo) return `background-image:url("${esc(room.photo)}")`;
  const [from, to] = PLACEHOLDER_COLORS[i % 6];
  return `background:linear-gradient(135deg,${from},${to})`;
}
const placeholderEmoji = (room, i = room.id) => (room.photo ? "" : PLACEHOLDER_EMOJI[i % 6]);