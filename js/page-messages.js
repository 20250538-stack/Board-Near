/* Messages page: the landlord inbox. */
"use strict";

function initInbox() {
  const box = $("#msgList");

  if (!user) {
    box.innerHTML = '<div class="empty">Login to see questions about your rooms.<br><a class="btn pri" href="login.html?next=messages.html">Login</a></div>';
    return;
  }

  const formatTime = t => new Date(t).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

  function replyLink(m) {
    const isEmail = m.contact.includes("@");
    return isEmail
      ? { href: `mailto:${encodeURI(m.contact)}?subject=${encodeURIComponent("Re: " + m.roomName)}`, label: "Reply by email" }
      : { href: `tel:${m.contact.replace(/[^\d+]/g, "")}`, label: "Call" };
  }

  function messageHTML(m) {
    const reply = replyLink(m);
    return `
<article class="msg${m.read ? "" : " new"}">
  <div class="mh"><b>${esc(m.from)}</b><span class="meta">${formatTime(m.t)}</span></div>
  <div class="meta">About: ${esc(m.roomName)} · ${esc(m.contact)}</div>
  <p>${esc(m.text)}</p>
  <div class="macts">
    <a class="btn so" href="${esc(reply.href)}">${reply.label}</a>
    <button class="btn so" data-del="${m.id}">Delete</button>
  </div>
</article>`;
  }

  function draw() {
    const mine = msgs.filter(m => m.owner === user.email).sort((a, b) => b.t - a.t);
    box.innerHTML = mine.length
      ? mine.map(messageHTML).join("")
      : '<div class="empty">No messages yet. When someone asks about your room, it shows up here.</div>';

    // Show new ones highlighted this time, then mark them read and refresh the header count
    if (mine.some(m => !m.read)) {
      mine.forEach(m => { m.read = true; });
      saveMsgs();
      renderAuth();
    }
  }

  box.addEventListener("click", e => {
    const button = e.target.closest("[data-del]");
    if (!button) return;
    const id = Number(button.dataset.del);
    msgs = msgs.filter(m => !(m.id === id && m.owner === user.email));
    saveMsgs();
    draw();
    toast("Message deleted");
  });

  draw();
}