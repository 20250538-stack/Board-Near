/* Runs last: theme toggle, mobile menu, then starts the current page. */
"use strict";

function initChrome() {
  const root = document.documentElement;
  const nav = $("#nav"), menuButton = $("#menuBtn"), themeButton = $("#theme");

  function setTheme(theme) {
    root.dataset.theme = theme;
    store.set("bn-theme", theme);
    themeButton.textContent = theme === "dark" ? "☀" : "☾";
  }
  setTheme(store.get("bn-theme", null) || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"));
  themeButton.onclick = () => setTheme(root.dataset.theme === "dark" ? "light" : "dark");

  menuButton.onclick = () => menuButton.setAttribute("aria-expanded", nav.classList.toggle("open"));
  nav.addEventListener("click", () => {
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
}

/* ===== Start ===== */

// Each page loads only its own file, so look the function up lazily
const PAGES = {
  home: () => initHome(),
  find: () => initFind(),
  post: () => initPost(),
  login: () => initLogin(),
  messages: () => initInbox(),
};

initChrome();
renderAuth();
(PAGES[PAGE] || (() => {}))();
