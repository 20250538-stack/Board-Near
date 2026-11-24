/* Messages page: chat between renters and landlords. */
"use strict";

// The Messages page: a list of chats on the left, the open chat on the right.
function initInbox() {
  const box = $("#msgList");

  if (!user) {
    box.innerHTML = '<div class="empty">Login to see your messages.<br><a class="btn pri" href="login.html?next=messages.html">Login</a></div>';
    return;
  }

  const recipient = m => (m.from === "owner" ? m.renter : m.owner);
  const threadKey = m => `${m.roomId}|${m.renter}`;
  const formatTime = t => new Date(t).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  let activeKey = decodeURIComponent(location.hash.slice(1));
  let current = null;   // the conversation that is open

  // Group the messages that involve me into conversations
  // Groups all messages into chats (one per room and renter) that involve the logged-in user.
  function getThreads() {
    const byKey = new Map();
    chats.filter(m => m.owner === user.email || m.renter === user.email).forEach(m => {
      const key = threadKey(m);
      if (!byKey.has(key)) byKey.set(key, { key, messages: [] });
      byKey.get(key).messages.push(m);
    });
    const threads = [...byKey.values()];
    threads.forEach(t => {
      t.messages.sort((a, b) => a.t - b.t);
      const first = t.messages[0];
      t.last = t.messages[t.messages.length - 1];
      t.roomName = first.roomName;
      t.iAmOwner = first.owner === user.email;
      t.with = t.iAmOwner ? first.renterName : (first.ownerName || "Landlord");
      t.first = first;
    });
    return threads.sort((a, b) => b.last.t - a.last.t);
  }

  const unreadIn = t => t.messages.filter(m => recipient(m) === user.email && !m.read).length;

  // Redraws the page. Opening a chat marks the other person's messages as read.
  function draw() {
    const threads = getThreads();
    if (!threads.length) {
      box.className = "msgs";
      box.innerHTML = '<div class="empty">No messages yet.<br>Open a room on Find a Room and tap "Send message" to start a chat.<br><a class="btn pri" href="find.html">Find a Room</a></div>';
      return;
    }
    if (!threads.some(t => t.key === activeKey)) activeKey = threads[0].key;
    current = threads.find(t => t.key === activeKey);

    // Opening a chat marks what the other person wrote as read
    let changed = false;
    current.messages.forEach(m => { if (recipient(m) === user.email && !m.read) { m.read = true; changed = true; } });
    if (changed) { saveChats(); renderAuth(); }

    const list = threads.map(t => {
      const n = unreadIn(t);
      return `<button class="thread${t.key === activeKey ? " on" : ""}" data-thread="${esc(t.key)}">
  <b>${esc(t.with)}${n ? ` <span class="dot">${n}</span>` : ""}</b>
  <div class="meta">About: ${esc(t.roomName)}</div>
  <div class="meta">${esc(t.last.text)}</div>
</button>`;
    }).join("");

    const bubbles = current.messages.map(m => {
      const mine = (m.from === "owner") === current.iAmOwner;
      return `<div class="bub${mine ? " me" : ""}">${esc(m.text)}<small>${formatTime(m.t)}</small></div>`;
    }).join("");

    box.className = "chatwrap";
    box.innerHTML = `
<div class="threads">${list}</div>
<section class="chat">
  <div class="chat-head">
    <div><b>${esc(current.with)}</b><div class="meta">About: ${esc(current.roomName)}</div></div>
    <button class="btn so" data-delthread="${esc(current.key)}">Delete chat</button>
  </div>
  <div class="bubbles">${bubbles}</div>
  <form class="chat-form" id="chatForm" novalidate>
    <textarea id="chatText" rows="2" placeholder="Type a message" aria-label="Message"></textarea>
    <button class="btn pri">Send</button>
  </form>
</section>`;
    const scroller = box.querySelector(".bubbles");
    scroller.scrollTop = scroller.scrollHeight;
  }

  // Click a chat in the list to open it, or Delete chat to remove it.
  box.addEventListener("click", e => {
    const open = e.target.closest("[data-thread]");
    const del = e.target.closest("[data-delthread]");
    if (open) {
      activeKey = open.dataset.thread;
      history.replaceState(null, "", "#" + encodeURIComponent(activeKey));
      draw();
    } else if (del) {
      if (!confirm("Delete this whole chat? The other person will not see it anymore.")) return;
      const key = del.dataset.delthread;
      chats = chats.filter(m => threadKey(m) !== key);
      saveChats();
      renderAuth();
      draw();
      toast("Chat deleted");
    }
  });

  // Sends a reply: adds a message to the chat and redraws.
  box.addEventListener("submit", e => {
    e.preventDefault();
    const input = $("#chatText"), text = input.value.trim();
    if (!text || !current) return;
    const first = current.first;
    chats.push({ id: uid(), roomId: first.roomId, roomName: first.roomName,
                 owner: first.owner, ownerName: first.ownerName, renter: first.renter, renterName: first.renterName,
                 from: current.iAmOwner ? "owner" : "renter", text, t: Date.now(), read: false });
    saveChats();
    draw();
    $("#chatText").focus();
  });

  // Enter sends, Shift+Enter makes a new line
  box.addEventListener("keydown", e => {
    if (e.target.id === "chatText" && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      $("#chatForm").requestSubmit();
    }
  });

  draw();
}
