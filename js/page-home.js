/* Home page: the stats boxes. */
"use strict";

function initHome() {
  $("#sCount").textContent = rooms.length;
  $("#sNear").textContent = rooms.filter(r => away(r) <= 500).length;
  $("#sMin").textContent = rooms.length ? peso(Math.min(...rooms.map(r => r.price))) : "–";
}