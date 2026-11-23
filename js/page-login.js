/* Login page: log in, sign up, forgot password. */
"use strict";

const ACCOUNTS_KEY = "bn-accounts";

// Note: this is a demo. Accounts live in this browser only, so it is not real security.
async function hashPassword(password, salt) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + password));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const newSalt = () => crypto.getRandomValues(new Uint32Array(2)).join("-");

const AUTH_MODES = {
  login:  { title: "Login", button: "Log In", name: 0, confirm: 0, remember: 1, forgot: 1,
            sub: 'Don\'t have an account? <a href="#" data-mode="signup">Sign up now</a>' },
  signup: { title: "Create account", button: "Sign Up", name: 1, confirm: 1, remember: 0, forgot: 0,
            sub: 'Already have an account? <a href="#" data-mode="login">Log in</a>' },
  forgot: { title: "Reset password", button: "Reset Password", name: 0, confirm: 0, remember: 0, forgot: 0,
            sub: 'Remembered it? <a href="#" data-mode="login">Back to Login</a>' },
};

function initLogin() {
  if (user) { location.replace(nextUrl()); return; }

  let mode = "login";
  const error = $("#aErr");
  const getAccounts = () => store.get(ACCOUNTS_KEY, {});

  function setMode(next) {
    mode = next;
    const m = AUTH_MODES[next];
    $("#aTitle").textContent = m.title;
    $("#aSub").innerHTML = m.sub;
    $("#aBtn").textContent = m.button;
    $("#fName").hidden = !m.name;
    $("#fConf").hidden = !m.confirm;
    $("#fRem").hidden = !m.remember;
    $("#forgotRow").hidden = !m.forgot;
    $("#aNote").hidden = next !== "forgot";
    $("#passLbl").textContent = next === "forgot" ? "New password" : "Password";
    $("#aPass").autocomplete = next === "login" ? "current-password" : "new-password";
    error.textContent = "";
  }

  function startSession(email, account, remember) {
    user = { name: account.name, email, picture: "", exp: Date.now() + (remember ? 30 : 1) * DAY };
    store.set("bn-auth", user, remember ? localStorage : sessionStorage);
    location.href = nextUrl();
  }

  async function submit(e) {
    e.preventDefault();
    error.textContent = "";
    const email = $("#aEmail").value.trim().toLowerCase();
    const password = $("#aPass").value;
    const fail = (message, field) => { error.textContent = message; if (field) $(field).focus(); };

    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.", "#aEmail");
    if (password.length < 6) return fail("Password must be at least 6 characters.", "#aPass");
    if (!(window.crypto && crypto.subtle)) return fail("Open the site with http://localhost or https so login can work.");

    const accounts = getAccounts();

    if (mode === "signup") {
      const name = $("#aName").value.trim();
      if (!name) return fail("Enter your full name.", "#aName");
      if (password !== $("#aConf").value) return fail("Passwords do not match.", "#aConf");
      if (accounts[email]) return fail("An account with this email already exists. Log in instead.");
      const salt = newSalt();
      accounts[email] = { name, salt, hash: await hashPassword(password, salt) };
      if (!store.set(ACCOUNTS_KEY, accounts)) return fail("Could not save your account (browser storage is blocked or full).");
      startSession(email, accounts[email], true);

    } else if (mode === "forgot") {
      if (!accounts[email]) return fail("No account with that email on this device.");
      const salt = newSalt();
      accounts[email].salt = salt;
      accounts[email].hash = await hashPassword(password, salt);
      store.set(ACCOUNTS_KEY, accounts);
      setMode("login");
      $("#aPass").value = "";
      toast("Password updated. Log in with your new password.");

    } else {
      const account = accounts[email];
      if (!account || account.hash !== await hashPassword(password, account.salt)) return fail("Wrong email or password.");
      startSession(email, account, $("#aRem").checked);
    }
  }

  $("#authCard").addEventListener("click", e => {
    const link = e.target.closest("[data-mode]");
    if (link) { e.preventDefault(); setMode(link.dataset.mode); }
  });
  $("#aEye").onclick = () => {
    const field = $("#aPass"), hidden = field.type === "password";
    field.type = hidden ? "text" : "password";
    $("#aEye").textContent = hidden ? "🙈" : "👁";
    $("#aEye").setAttribute("aria-label", hidden ? "Hide password" : "Show password");
  };
  $("#authForm").onsubmit = submit;

  setMode("login");
  loadGoogleButton();
}
