/* Find a Room page: map, filters, room list, room dialog, messaging a landlord. */
"use strict";

// The Find a Room page. Everything inside works with the map, the room list and the room pop-up.
function initFind() {
  const list = $("#list"), dialog = $("#dlg");
  const filters = {};          // which filter chips are on
  let selectedId = null;       // room whose dialog is open
  let map = null, markerLayer = null, lastBoundsKey = "";

  /* ---- Map ---- */
  if (mapsAvailable()) {
    map = L.map("map").setView([SCHOOL.lat, SCHOOL.lng], 16);
    addTiles(map);
    L.marker([SCHOOL.lat, SCHOOL.lng], { icon: schoolIcon(), title: SCHOOL.name }).addTo(map).bindTooltip(SCHOOL.name);
    [250, 500, 1000].forEach(radius =>
      L.circle([SCHOOL.lat, SCHOOL.lng], { radius, color: "#0f3d3e", weight: 1.5, dashArray: "5 6", fillOpacity: 0 }).addTo(map));
    markerLayer = L.layerGroup().addTo(map);
  } else {
    $("#map").innerHTML = '<p class="empty">The map could not load. Check your internet connection and refresh.</p>';
  }

  // Shows one marker on the map for each room that matches the filters.
  function drawMap(visible) {
    if (!map) return;
    markerLayer.clearLayers();
    visible.forEach(room => {
      L.marker(coords(room), { title: room.name })
        .addTo(markerLayer)
        .bindTooltip(`${room.name} · ${peso(room.price)}`)
        .on("click", () => openRoom(room.id));
    });
    // Re-fit only when the set of rooms changes, so saving a heart doesn't make the map jump
    const key = visible.map(r => r.id).join(",");
    if (key !== lastBoundsKey) {
      map.fitBounds([[SCHOOL.lat, SCHOOL.lng], ...visible.map(coords)], { padding: [30, 30], maxZoom: 17 });
      lastBoundsKey = key;
    }
  }

  /* ---- Room list ---- */
  // Returns only the rooms that pass the filter chips, sorted by price or distance.
  function visibleRooms() {
    const matches = rooms.filter(r =>
      (!filters.price || r.price < 1500) &&
      (!filters.dist || away(r) <= 500) &&
      (!filters.wifi || r.wifi) &&
      (!filters.bath || r.bath) &&
      (!filters.fav || favs.has(r.id)));
    const byPrice = (a, b) => a.price - b.price;
    const byDistance = (a, b) => away(a) - away(b);
    return matches.sort($("#sort").value === "price" ? byPrice : byDistance);
  }

  // Builds the HTML for one room card.
  function cardHTML(room) {
    const saved = favs.has(room.id);
    return `
<article class="card${selectedId === room.id ? " on" : ""}" data-id="${room.id}">
  <div class="photo" style="${photoStyle(room)}">${placeholderEmoji(room)}
    <button class="heart" data-fav="${room.id}" aria-pressed="${saved}" aria-label="Save ${esc(room.name)}">${saved ? "♥" : "♡"}</button>
    <span class="badge">${away(room)} m from campus</span>
  </div>
  <div class="cbody">
    <h3><button class="open" data-open="${room.id}">${esc(room.name)}</button></h3>
    <div class="meta">${esc(room.loc)}</div>
    <div class="price">${peso(room.price)}<span class="meta"> /month</span></div>
    <div>${room.wifi ? '<span class="tag">WiFi</span>' : ""}${room.bath ? '<span class="tag">Own bathroom</span>' : ""}</div>
    ${isMine(room) ? `<button class="del" data-del="${room.id}" aria-label="Delete ${esc(room.name)}">Delete</button>` : ""}
  </div>
</article>`;
  }

  function emptyHTML() {
    return rooms.length
      ? '<div class="empty">No rooms match these filters. Turn one off to see more rooms.</div>'
      : '<div class="empty">No rooms posted yet.<br><a class="btn pri" href="post.html"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="M9 13h6"/></svg>Post a Room</a></div>';
  }

  // Redraws the room list, the room count and the map. Call it after anything changes.
  function render() {
    const visible = visibleRooms();
    list.innerHTML = visible.length ? visible.map(cardHTML).join("") : emptyHTML();
    $("#result").textContent = `${visible.length} of ${rooms.length} rooms`;
    drawMap(visible);
  }

  function highlightSelected() {
    list.querySelectorAll(".card").forEach(c => c.classList.toggle("on", Number(c.dataset.id) === selectedId));
  }

  /* ---- Room dialog ---- */
  // The box under the room details: log in first, then chat with the landlord on the Messages page
  // The box under the room details: log in first, then message the landlord.
  function messageAreaHTML(room) {
    if (!room.owner) return '<p class="meta">This old listing has no owner account, so it cannot receive messages.</p>';
    if (!user) return '<div class="lbl">Message the landlord</div><p class="meta">Log in to chat with the landlord right here on the site.</p><a class="btn pri" href="login.html?next=find.html">Log in to message</a>';
    if (isMine(room)) return '<p class="meta">This is your room. Messages from students show up on the Messages page.</p>';
    return `
<form class="msg-form" id="msgForm" novalidate>
  <div class="lbl">Message the landlord</div>
  <div class="qs">${QUICK_QUESTIONS.map(q => `<button type="button" class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <textarea id="mMsg" rows="3" placeholder="Type your message, like when you want to visit" aria-label="Message"></textarea>
  <p class="err" id="mErr" role="alert"></p>
  <button class="btn pri end">Send message</button>
</form>`;
  }

  // Builds the HTML for the room pop-up.
  function roomDialogHTML(room) {
    const minutes = Math.max(1, Math.round(away(room) / WALK_METERS_PER_MIN));
    const thumbs = room.photo ? "" : `<div class="thumbs">${[0, 1, 2].map(i =>
      `<span style="${photoStyle(room, room.id + i)}">${placeholderEmoji(room, room.id + i)}</span>`).join("")}</div>`;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${coords(room).join(",")}`;

    return `
<div class="big" style="${photoStyle(room)}">${placeholderEmoji(room)}</div>
${thumbs}
<div>
  <h3 class="room-title">${esc(room.name)}</h3>
  <div class="meta">${esc(room.loc)} · ${away(room)} m (about ${minutes} min walk)</div>
  <div class="price room-price">${peso(room.price)} <span class="meta">/month</span></div>
  <p>${esc(room.desc || "Contact the landlord for details.")}</p>
  <span class="tag">${room.wifi ? "WiFi" : "No WiFi"}</span>
  <span class="tag">${room.bath ? "Own bathroom" : "Shared bathroom"}</span>
</div>
<a class="btn" href="${mapsLink}" target="_blank" rel="noopener">Open in Google Maps</a>
${messageAreaHTML(room)}`;
  }

  // Saves the renter's message as a chat and opens the chat page.
  function sendMessage(room) {
    const text = $("#mMsg").value.trim();
    if (text.length < 3) {
      $("#mErr").textContent = "Write your message first.";
      $("#mMsg").focus();
      return;
    }
    chats.push({ id: uid(), roomId: room.id, roomName: room.name, owner: room.owner, ownerName: room.ownerName || "Landlord",
                 renter: user.email, renterName: user.name, from: "renter", text, t: Date.now(), read: false });
    if (!saveChats()) {
      chats.pop();
      $("#mErr").textContent = "Could not save the message (browser storage is full).";
      return;
    }
    // Go straight to the chat so the renter sees the conversation
    location.href = "messages.html#" + encodeURIComponent(`${room.id}|${user.email}`);
  }

  // Opens the pop-up for the room with this id.
  function openRoom(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    selectedId = id;
    highlightSelected();

    $("#dBody").innerHTML = roomDialogHTML(room);
    const form = $("#msgForm");
    if (form) form.onsubmit = e => { e.preventDefault(); sendMessage(room); };
    $("#dBody").querySelectorAll("[data-q]").forEach(button => {
      button.onclick = () => {
        const box = $("#mMsg");
        box.value = (box.value ? box.value + " " : "") + button.dataset.q;
        box.focus();
      };
    });
    dialog.showModal();
  }

  // Deletes a room, but only if it belongs to the logged-in user.
  function deleteRoom(id) {
    const room = rooms.find(r => r.id === id);
    if (!room || !isMine(room)) return;
    if (!confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    rooms = rooms.filter(r => r.id !== id);
    favs.delete(id);
    saveRooms();
    saveFavs();
    render();
    toast("Room deleted");
  }

  // Heart button: save or unsave a room.
  function toggleFavorite(id) {
    if (favs.has(id)) favs.delete(id); else favs.add(id);
    saveFavs();
    render();
  }

  /* ---- Events ---- */
  // One click listener for the whole list: it checks if the heart, Delete or room name was clicked.
  list.addEventListener("click", e => {
    const fav = e.target.closest("[data-fav]");
    const del = e.target.closest("[data-del]");
    const open = e.target.closest("[data-open]");
    if (fav) toggleFavorite(Number(fav.dataset.fav));
    else if (del) deleteRoom(Number(del.dataset.del));
    else if (open) openRoom(Number(open.dataset.open));
  });

  $("#chips").addEventListener("click", e => {
    const chip = e.target.closest("button[data-f]");
    if (!chip) return;
    const key = chip.dataset.f;
    filters[key] = !filters[key];
    chip.setAttribute("aria-pressed", filters[key]);
    render();
  });
  $("#sort").onchange = render;

  $("#dClose").onclick = () => dialog.close();
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); }); // click on the dark backdrop
  dialog.addEventListener("close", () => { selectedId = null; highlightSelected(); });

  render();
  if (location.hash === "#posted") {
    toast("Room posted");
    history.replaceState(null, "", "find.html");
  }
}
