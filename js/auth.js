/* Who is logged in, the header Login/Sign out area, and Google sign-in. */
"use strict";

let user = null;
{
  const saved = store.get("bn-auth", null) || store.get("bn-auth", null, sessionStorage);
  if (saved && saved.exp > Date.now()) user = saved;
}
const isMine = room => Boolean(user) && room.owner === user.email;

// Only allow redirects to our own pages like "post.html"
function nextUrl() {
  const next = new URLSearchParams(location.search).get("next") || "";
  return /^[a-z]+\.html$/.test(next) ? next : "find.html";
}

function signOut() {
  user = null;
  store.remove("bn-auth");
  store.remove("bn-auth", sessionStorage);
  if (window.google && google.accounts) google.accounts.id.disableAutoSelect();
  location.reload();
}

function renderAuth() {
  const box = $("#auth");
  if (!box) return;

  if (!user) {
    // Login is only needed to post a room, so signed-out visitors see no Login button elsewhere
    if (PAGE !== "post") { box.innerHTML = ""; return; }
    const here = location.pathname.split("/").pop() || "index.html";
    box.innerHTML = `<a class="btn pri so" href="login.html?next=${encodeURIComponent(here)}">Login</a>`;
    return;
  }

  const unread = msgs.filter(m => m.owner === user.email && !m.read).length;
  const avatar = user.picture
    ? `<img class="avatar" src="${esc(user.picture)}" alt="" referrerpolicy="no-referrer">`
    : `<span class="avatar ini">${esc((user.name || "?")[0].toUpperCase())}</span>`;

  box.innerHTML =
    `<a class="btn so" href="messages.html">Messages${unread ? ` (${unread})` : ""}</a>` +
    avatar +
    `<span class="uname">${esc(user.name)}</span>` +
    `<button class="btn so" id="signOut">Sign out</button>`;
  $("#signOut").onclick = signOut;
}

/* ---- Google sign-in (loaded only if a client ID is set, only on the login page) ---- */

function parseJwt(token) {
  const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))));
}

function onGoogleCredential(response) {
  try {
    const p = parseJwt(response.credential);
    user = { name: p.name || p.email, email: p.email.toLowerCase(), picture: p.picture || "", exp: Date.now() + 7 * DAY };
    store.set("bn-auth", user);
  } catch {
    toast("Login failed. Try again.");
    return;
  }
  location.href = nextUrl();
}

function loadGoogleButton() {
  const wrap = $("#gWrap");
  if (!GOOGLE_ENABLED) { wrap.hidden = true; return; }
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.onload = () => {
    google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onGoogleCredential });
    google.accounts.id.renderButton($("#gBtn"), {
      theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 300,
    });
  };
  script.onerror = () => { wrap.hidden = true; };
  document.head.appendChild(script);
}
