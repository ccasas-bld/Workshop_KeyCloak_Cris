import express from "express";
import session from "express-session";
import "dotenv/config";
import { Issuer, generators } from "openid-client";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // en prod con https
    },
  })
);

// Servir frontend estático
app.use(express.static(path.join(__dirname, "public")));

let client;

// Inicializa discovery OIDC desde Keycloak (well-known)
async function init() {
  const realm = process.env.KC_REALM;
  const issuerUrl = `${process.env.KC_BASE_URL}/realms/${realm}`;
  const issuer = await Issuer.discover(issuerUrl);

  client = new issuer.Client({
    client_id: process.env.KC_CLIENT_ID,
    client_secret: process.env.KC_CLIENT_SECRET,
    redirect_uris: [process.env.KC_REDIRECT_URI],
    response_types: ["code"],
  });

  console.log("OIDC issuer:", issuer.issuer);
}

// Home: siempre devuelve index.html (UI decide qué mostrar)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint para que el frontend sepa si hay sesión
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ authenticated: false });
  }
  res.json({
    authenticated: true,
    user: req.session.user,
    claims: req.session.claims ?? {},
  });
});

// Inicia login (Authorization Code + PKCE)
app.get("/login", (req, res) => {
  const code_verifier = generators.codeVerifier();
  const code_challenge = generators.codeChallenge(code_verifier);

  req.session.code_verifier = code_verifier;

  const authUrl = client.authorizationUrl({
    scope: "openid profile email",
    code_challenge,
    code_challenge_method: "S256",
  });

  res.redirect(authUrl);
});

// Callback OIDC
app.get("/callback", async (req, res, next) => {
  try {
    const params = client.callbackParams(req);
    const tokenSet = await client.callback(process.env.KC_REDIRECT_URI, params, {
      code_verifier: req.session.code_verifier,
    });

    const claims = tokenSet.claims();
    const displayName =
      claims.name || claims.preferred_username || claims.email || "usuario";

    req.session.user = displayName;
    req.session.claims = claims;

    res.redirect("/"); // vuelve al frontend
  } catch (e) {
    next(e);
  }
});

// Logout local (borra sesión)
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "desconocido" });
});

await init();

app.listen(process.env.PORT, () => {
  console.log(`Dummy app en http://localhost:${process.env.PORT}`);
});
