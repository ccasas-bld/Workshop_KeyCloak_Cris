async function loadMe() {
  const r = await fetch("/api/me", { headers: { "Accept": "application/json" } });
  return r.json();
}

function el(tag, attrs = {}, text = "") {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text) n.textContent = text;
  return n;
}

function renderLoggedOut() {
  document.querySelector("#title").textContent = "No autenticado";
  document.querySelector("#desc").textContent = "Inicia sesión con Keycloak.";
  document.querySelector("#badge").textContent = "OFF";
  document.querySelector("#claimsBox").hidden = true;

  const actions = document.querySelector("#actions");
  actions.innerHTML = "";
  actions.appendChild(el("a", { class: "btn primary", href: "/login" }, "Login con Keycloak"));
}

function renderLoggedIn(me) {
  document.querySelector("#title").textContent = `Hola Mundo, ${me.user}`;
  document.querySelector("#desc").textContent = "Sesión activa.";
  document.querySelector("#badge").textContent = "ON";

  const actions = document.querySelector("#actions");
  actions.innerHTML = "";
  actions.appendChild(el("a", { class: "btn", href: "/" }, "Refrescar"));
  actions.appendChild(el("a", { class: "btn", href: "/logout" }, "Logout"));

  const claimsBox = document.querySelector("#claimsBox");
  claimsBox.hidden = false;
  document.querySelector("#claims").textContent = JSON.stringify(me.claims ?? {}, null, 2);
}

(async function main() {
  try {
    const me = await loadMe();
    if (!me.authenticated) renderLoggedOut();
    else renderLoggedIn(me);
  } catch (e) {
    document.querySelector("#title").textContent = "Error";
    document.querySelector("#desc").textContent = e?.message || "No se pudo cargar la sesión.";
    document.querySelector("#badge").textContent = "ERR";
  }
})();
