/* Settings and small helpers used by every page. Loaded first. */
"use strict";

/* ===== Config ===== */

const PAGE = document.body.dataset.page;

// Northern Bukidnon State College, Kihare, Tankulan, Manolo Fortich.
// Nudge these two numbers if the school pin looks off.
const SCHOOL = { name: "Northern Bukidnon State College", lat: 8.3596, lng: 124.8686 };

// Google sign-in is optional. To turn it on:
//  1. Create an OAuth "Web application" client ID (console.cloud.google.com > APIs & Services > Credentials)
//  2. Add your site (e.g. http://localhost:5500) under "Authorized JavaScript origins"
//  3. Paste the client ID below
const CLIENT_ID = "PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_ENABLED = !CLIENT_ID.startsWith("PASTE_");

const DAY = 864e5;
const WALK_METERS_PER_MIN = 80;
const PLACEHOLDER_COLORS = [
  ["#7fd1b9", "#2a9d8f"], ["#f5b700", "#e07a1f"], ["#9ad1f5", "#3d7ccf"],
  ["#f4a6b8", "#c9506f"], ["#c3e88d", "#5fa83a"], ["#d3b8f5", "#7a52c7"],
];
const PLACEHOLDER_EMOJI = ["🏠", "🛏️", "🌿", "🏡", "📚", "☀️"];
const QUICK_QUESTIONS = [
  "Is this room still available?",
  "Can I visit this week?",
  "Is the price negotiable?",
  "How much is the deposit?",
];

/* ===== Helpers ===== */

const $ = selector => document.querySelector(selector);
const peso = n => "₱" + n.toLocaleString("en-PH");
const uid = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = value => String(value).replace(/[&<>"']/g, c => ESCAPES[c]);

// Storage that never throws (private mode, full disk, blocked cookies...)
const store = {
  get(key, fallback, area = localStorage) {
    try {
      const raw = area.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value, area = localStorage) {
    try { area.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  remove(key, area = localStorage) {
    try { area.removeItem(key); } catch { /* nothing to do */ }
  },
};

let toastTimer;
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
