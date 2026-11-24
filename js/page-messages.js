/* Messages page: private chat between renters and landlords, like Messenger. */
"use strict";

function initInbox() {
  const box = $("#msgList");

  if (!user) {
    box.innerHTML = '<div class="empty">Login to see your messages.<br><a class="btn pri" href="login.html?next=messages.html">Login</a></div>';
    return;
  }

  const SEND_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z"/></svg>';
  const GAP = 30 * 60 * 1000;   // more than 30 minutes apart = show a time label

  // The other person in a message is the "recipient"
  const recipient = m => (m.from === "owner" ? m.renter : m.owner);
  const threadKey = m => `${m.roomId}|${m.renter}`;
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const longTime = t => new Date(t).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const shortTime = t => sameDay(t, Date.now())
    ? new Date(t).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
    : new Date(t).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const isWide = () => matchMedia("(min-width: 821px)").matches;

  // Round picture with the first letter of the name and a color picked from the name
  function avatar(name, small) {
    const text = name || "?";
    const sum = [...text].reduce((total, c) => total + c.charCodeAt(0), 0);
    const [from, to] = PLACEHOLDER_COLORS[sum % 6];
    return `<span class="av${small ? " sm" : ""}" style="background:linear-gradient(135deg,${from},${to})">${esc(text.trim()[0].toUpperCase())}</span>`;
  }

  let activeKey = decodeURIComponent(location.hash.slice(1));
  let showChat = Boolean(activeKey);   // on phones: false = list of chats, true = one open chat
  let current = null;                  // the conversation that is open

  // Group all messages into chats (one per room and renter) that involve me
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
      t.first = t.messages[0];
      t.last = t.messages[t.messages.length - 1];
      t.roomName = t.first.roomName;
      t.iAmOwner = t.first.owner === user.email;
      t.with = t.iAmOwner ? t.first.renterName : (t.first.ownerName || "Landlord");
      t.unread = t.messages.filter(m => recipient(m) === user.email && !m.read).length;
    });
    return threads.sort((a, b) => b.last.t - a.last.t);
  }

  function conversationHTML(t) {
    const lastIsMine = (t.last.from === "owner") === t.iAmOwner;
    return `
<button class="conv${t.key === activeKey ? " on" : ""}${t.unread ? " unread" : ""}" data-thread="${esc(t.key)}">
  ${avatar(t.with)}
  <span class="cbox">
    <span class="crow"><span class="cname">${esc(t.with)}</span><span class="ctime">${shortTime(t.last.t)}</span></span>
    <span class="crow"><span class="cprev">${lastIsMine ? "You: " : ""}${esc(t.last.text)}</span>${t.unread ? `<span class="dot">${t.unread}</span>` : ""}</span>
  </span>
</button>`;
  }

  // Bubbles in groups, like Messenger: same sender close together share rounded corners
  function bubblesHTML(t) {
    const list = t.messages;
    const isMine = m => (m.from === "owner") === t.iAmOwner;
    let html = "";
    list.forEach((m, i) => {
      const prev = list[i - 1], next = list[i + 1];
      const gapBefore = !prev || m.t - prev.t > GAP || !sameDay(m.t, prev.t);
      const gapAfter = !next || next.t - m.t > GAP || !sameDay(m.t, next.t);
      const starts = gapBefore || isMine(prev) !== isMine(m);
      const ends = gapAfter || isMine(next) !== isMine(m);
      const mine = isMine(m);

      if (gapBefore) html += `<div class="stamp">${longTime(m.t)}</div>`;
      html += `<div class="mrow ${mine ? "me" : "them"}${starts ? " st" : ""}${ends ? " en" : ""}">
  ${mine ? "" : (ends ? avatar(t.with, true) : '<span class="av sm ghost"></span>')}
  <div class="bub">${esc(m.text)}</div>
</div>`;
    });
    const last = list[list.length - 1];
    if ((last.from === "owner") === t.iAmOwner) html += `<div class="seen">${last.read ? "Seen" : "Sent"}</div>`;
    return html;
  }

  // Redraws the whole page. Opening a chat marks the other person's messages as read.
  function draw() {
    let threads = getThreads();
    if (!threads.length) {
      box.className = "msgs";
      box.innerHTML = '<div class="empty">No messages yet.<br>Open a room on Find a Room and tap "Send message" to start a chat.<br><a class="btn pri" href="find.html">Find a Room</a></div>';
      return;
    }
    if (!threads.some(t => t.key === activeKey)) activeKey = isWide() ? threads[0].key : "";
    current = threads.find(t => t.key === activeKey) || null;
    if (!current) showChat = false;

    if (current && (showChat || isWide())) {
      let changed = false;
      current.messages.forEach(m => { if (recipient(m) === user.email && !m.read) { m.read = true; changed = true; } });
      if (changed) { saveChats(); renderAuth(); threads = getThreads(); current = threads.find(t => t.key === activeKey); }
    }

    box.className = "messenger";
    box.dataset.view = showChat ? "chat" : "list";
    box.innerHTML = `
<aside class="convs">
  <div class="convs-head">Chats</div>
  ${threads.map(conversationHTML).join("")}
</aside>
<section class="chat">
  ${current ? `
  <div class="chat-head">
    <button class="ib back" data-back aria-label="Back to chats">&larr;</button>
    ${avatar(current.with)}
    <div class="who"><b>${esc(current.with)}</b><span>About: ${esc(current.roomName)}</span></div>
    <button class="ib" data-delthread="${esc(current.key)}" aria-label="Delete chat" title="Delete chat">&#128465;</button>
  </div>
  <div class="bubbles">${bubblesHTML(current)}</div>
  <form class="composer" id="chatForm" novalidate>
    <textarea id="chatText" rows="1" placeholder="Aa" aria-label="Message"></textarea>
    <button class="send" aria-label="Send" disabled>${SEND_ICON}</button>
  </form>` : '<div class="empty" style="margin:20px">Pick a chat to start.</div>'}
</section>`;

    const scroller = box.querySelector(".bubbles");
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }

  // Click a chat to open it, the back arrow to return to the list (phones), or the bin to delete the chat
  box.addEventListener("click", e => {
    const open = e.target.closest("[data-thread]");
    const back = e.target.closest("[data-back]");
    const del = e.target.closest("[data-delthread]");
    if (open) {
      activeKey = open.dataset.thread;
      showChat = true;
      history.replaceState(null, "", "#" + encodeURIComponent(activeKey));
      draw();
    } else if (back) {
      showChat = false;
      draw();
    } else if (del) {
      if (!confirm("Delete this whole chat? The other person will not see it anymore.")) return;
      const key = del.dataset.delthread;
      chats = chats.filter(m => threadKey(m) !== key);
      saveChats();
      activeKey = "";
      showChat = false;
      history.replaceState(null, "", location.pathname);
      renderAuth();
      draw();
      toast("Chat deleted");
    }
  });

  // Sends a message: adds it to the chat and redraws
  box.addEventListener("submit", e => {
    e.preventDefault();
    const text = $("#chatText").value.trim();
    if (!text || !current) return;
    const first = current.first;
    chats.push({ id: uid(), roomId: first.roomId, roomName: first.roomName,
                 owner: first.owner, ownerName: first.ownerName, renter: first.renter, renterName: first.renterName,
                 from: current.iAmOwner ? "owner" : "renter", text, t: Date.now(), read: false });
    saveChats();
    draw();
    $("#chatText").focus();
  });

  // The text box grows as you type, and Send turns on only when there is text
  box.addEventListener("input", e => {
    if (e.target.id !== "chatText") return;
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    box.querySelector(".send").disabled = !e.target.value.trim();
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
