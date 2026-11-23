/* Post a Room page: map pin picker, photo upload, saving the listing. */
"use strict";

// Shrink the chosen photo so it fits comfortably in browser storage
function resizePhoto(file, maxWidth = 600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

function initPost() {
  // Signed-out visitors only see the "please log in" box
  if (!user) {
    $("#postForm").hidden = true;
    $("#gate").hidden = false;
    return;
  }

  const locationBox = $("#pLoc"), errorBox = $("#pErr"), drop = $("#drop");
  let pos = null, pin = null, photo = "";
  let locationIsAuto = true;   // true while the Location box was filled by the map, not typed
  let lookupTimer, lookupId = 0;

  /* ---- Map picker ---- */
  if (!mapsAvailable()) {
    $("#pick").innerHTML = '<p class="empty">The map could not load. Check your internet connection and refresh.</p>';
    return;
  }
  const pickMap = L.map("pick").setView([SCHOOL.lat, SCHOOL.lng], 16);
  addTiles(pickMap);
  L.circleMarker([SCHOOL.lat, SCHOOL.lng], { radius: 9, color: "#0f3d3e", fillColor: "#f5b700", fillOpacity: 1, weight: 3 })
    .addTo(pickMap).bindTooltip(SCHOOL.name);

  const asCoordinates = (lat, lng) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  // Turn the pin into a street address (OpenStreetMap Nominatim), without overwriting what the landlord typed
  function fillAddress(lat, lng) {
    clearTimeout(lookupTimer);
    lookupTimer = setTimeout(async () => {
      const thisLookup = ++lookupId;
      const canFill = () => thisLookup === lookupId && (locationIsAuto || !locationBox.value.trim());
      let text = "";
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`;
        const data = await (await fetch(url)).json(), a = data.address || {};
        text = [a.road || a.pedestrian || a.amenity,
                a.neighbourhood || a.suburb || a.village || a.hamlet,
                a.city || a.town || a.municipality || a.county]
          .filter(Boolean).join(", ") || data.display_name || "";
      } catch { /* offline: fall back to coordinates below */ }
      if (canFill()) {
        locationBox.value = text || asCoordinates(lat, lng);
        locationIsAuto = true;
      }
    }, 400);
  }

  function setPin(lat, lng) {
    pos = [lat, lng];
    if (pin) {
      pin.setLatLng(pos);
    } else {
      pin = L.marker(pos, { draggable: true }).addTo(pickMap);
      pin.on("dragend", () => setPin(pin.getLatLng().lat, pin.getLatLng().lng));
    }
    $("#pickInfo").textContent = `Pin set: ${metersFromSchool(lat, lng)} m from the school.`;
    errorBox.textContent = "";
    fillAddress(lat, lng);
  }

  pickMap.on("click", e => setPin(e.latlng.lat, e.latlng.lng));
  locationBox.addEventListener("input", () => { locationIsAuto = false; });

  $("#useMe").onclick = () => {
    if (!navigator.geolocation) {
      errorBox.textContent = "Your browser can't get your location. Tap the map instead.";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      g => { setPin(g.coords.latitude, g.coords.longitude); pickMap.setView(pos, 17); },
      () => { errorBox.textContent = "Could not get your location. Tap the map instead."; });
  };

  /* ---- Photo ---- */
  drop.onclick = () => $("#pFile").click();
  $("#pFile").onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      photo = await resizePhoto(file);
      drop.style.backgroundImage = `url("${photo}")`;
      drop.textContent = "";
      errorBox.textContent = "";
    } catch {
      photo = "";
      errorBox.textContent = "That file doesn't look like a photo. Try a JPG or PNG.";
    }
  };

  /* ---- Submit ---- */
  $("#postForm").onsubmit = e => {
    e.preventDefault();
    const name = $("#pName").value.trim(), loc = locationBox.value.trim(), price = Number($("#pPrice").value);

    if (!name || !loc || !(price > 0)) {
      errorBox.textContent = "Fill in the boarding house name, location and a price above ₱0.";
      return;
    }
    if (!pos) {
      errorBox.textContent = "Tap the map to drop a pin where your boarding house is.";
      return;
    }

    const room = {
      id: uid(), name, loc, price,
      lat: pos[0], lng: pos[1],
      wifi: $("#pWifi").checked ? 1 : 0,
      bath: $("#pBath").checked ? 1 : 0,
      photo, owner: user.email, ownerName: user.name,
      desc: "New listing. Message the landlord for details.",
    };
    rooms.push(room);
    if (!saveRooms()) {
      rooms.pop();
      errorBox.textContent = "Could not save your room (browser storage is full). Try a smaller photo or remove an old listing.";
      return;
    }
    location.href = "find.html#posted";
  };
}
