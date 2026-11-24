/* Saved data (rooms, favorites, messages) and distance/photo helpers. */
"use strict";

// Old versions saved map positions as x/y "pixels" on a drawing.
// Convert those to real coordinates once, so old listings still work.
const GRID_STEP = 0.000036, GRID_CX = 300, GRID_CY = 260;
// Old rooms saved x/y positions. This turns them into real map coordinates (lat/lng).
function migrateRoom(room) {
  if (room.lat == null && room.x != null) {
    room.lat = SCHOOL.lat - (room.y - GRID_CY) * GRID_STEP;
    room.lng = SCHOOL.lng + (room.x - GRID_CX) * GRID_STEP;
  }
  delete room.x;
  delete room.y;
  return room;
}

// The saved data. rooms, favorites and old messages are read from localStorage when the page opens.
// Everything stays in this browser, so other computers do not see it.
let rooms = store.get("bn-user", []).map(migrateRoom);
let favs = new Set(store.get("bn-favs", []));
let msgs = store.get("bn-msgs", []);

// Call these after changing the lists above to save them again.
const saveRooms = () => store.set("bn-user", rooms);
const saveFavs = () => store.set("bn-favs", [...favs]);
const saveMsgs = () => store.set("bn-msgs", msgs);

// Chat messages between a renter and a landlord (one conversation per room and renter)
// Chat messages between a renter and a landlord. One chat = one room + one renter.
let chats = store.get("bn-chats", []);
const saveChats = () => store.set("bn-chats", chats);

// Messages from the old inbox become chat messages (done once)
if (msgs.length) {
  msgs.forEach(m => chats.push({
    id: m.id, roomId: m.roomId, roomName: m.roomName, owner: m.owner, ownerName: "",
    renter: m.contact.includes("@") ? m.contact.toLowerCase() : "guest-" + m.id,
    renterName: m.from, from: "renter", text: m.text, t: m.t, read: m.read,
  }));
  msgs = [];
  saveMsgs();
  saveChats();
}

// Straight-line distance to the school in metres (haversine), rounded to 10 m
// Distance from the school in meters (straight line), rounded to 10 m.
function metersFromSchool(lat, lng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat - SCHOOL.lat) * rad, dLng = (lng - SCHOOL.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(SCHOOL.lat * rad) * Math.cos(lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round((2 * R * Math.asin(Math.sqrt(a))) / 10) * 10;
}
const away = room => metersFromSchool(room.lat, room.lng);
const coords = room => [room.lat, room.lng];

// The CSS background for a room: its photo, or a colored gradient if it has no photo.
function photoStyle(room, i = room.id) {
  // Single quotes here: this text goes inside style="...", so double quotes would cut it short
  if (room.photo) return `background-image:url('${esc(room.photo)}')`;
  const [from, to] = PLACEHOLDER_COLORS[i % 6];
  return `background:linear-gradient(135deg,${from},${to})`;
}
const placeholderEmoji = (room, i = room.id) => (room.photo ? "" : PLACEHOLDER_EMOJI[i % 6]);
