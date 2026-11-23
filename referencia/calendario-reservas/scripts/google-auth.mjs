// Conecta la web con tu Google Calendar (se ejecuta una sola vez).
// Lee GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET de .env.local (o los pide si no existe), abre el navegador para autorizar
// y guarda GOOGLE_REFRESH_TOKEN en .env.local sin mostrarlo por pantalla.
//
//   node scripts/google-auth.mjs

import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import readline from "node:readline";

const ENV_PATH = path.join(process.cwd(), ".env.local");
const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()])
  );
}

function writeEnvValue(key, value) {
  const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(current) ? current.replace(pattern, line) : `${current.replace(/\n?$/, "\n")}${line}\n`;
  fs.writeFileSync(ENV_PATH, next);
}

// Si todavía no hay .env.local, pide el ID y el secreto aquí mismo y crea el archivo.
const env = readEnv();
let clientId = env.GOOGLE_CLIENT_ID;
let clientSecret = env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (question) => {
    process.stdout.write(question);
    const { value } = await lines.next();
    return String(value ?? "").trim();
  };
  if (!clientId) {
    clientId = await ask("Pega el ID de cliente de Google y pulsa Enter: ");
  }
  if (!clientSecret) {
    clientSecret = await ask("Pega el secreto del cliente y pulsa Enter: ");
  }
  rl.close();
}
if (!/\.apps\.googleusercontent\.com$/.test(clientId) || !clientSecret) {
  console.error("\nEl ID o el secreto no parecen correctos. Vuelve a ejecutar el comando y pégalos otra vez.");
  if (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET) console.error("Antes, borra los guardados con: rm .env.local");
  process.exit(1);
}
writeEnvValue("GOOGLE_CLIENT_ID", clientId);
writeEnvValue("GOOGLE_CLIENT_SECRET", clientSecret);

const state = crypto.randomBytes(16).toString("hex");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const code = url.searchParams.get("code");
  if (!code && !url.searchParams.get("error")) {
    res.writeHead(404).end();
    return;
  }

  const finish = (status, message) => {
    res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<p style="font:16px system-ui;padding:40px">${message}</p>`);
    server.close();
  };

  if (url.searchParams.get("state") !== state || !code) {
    console.error("Autorización cancelada o no válida.");
    finish(400, "No se ha completado la autorización. Vuelve a la terminal.");
    process.exitCode = 1;
    return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenRes.json();

  if (!tokens.refresh_token) {
    console.error("Google no ha devuelto el token:", tokens.error_description || tokens.error || "sin detalle");
    finish(500, "Algo ha fallado. Vuelve a la terminal.");
    process.exitCode = 1;
    return;
  }

  writeEnvValue("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);
  const payload = tokens.id_token ? JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url")) : {};
  console.log(`\n✓ Calendario conectado: ${payload.email || "cuenta autorizada"}`);
  console.log("✓ GOOGLE_REFRESH_TOKEN guardado en .env.local\n");
  finish(200, "Listo. Ya puedes cerrar esta pestaña y volver a la terminal.");
});

let redirectUri;
server.listen(0, "127.0.0.1", () => {
  redirectUri = `http://127.0.0.1:${server.address().port}`;
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    });
  console.log("Abriendo el navegador para autorizar tu Google Calendar…");
  console.log("Si no se abre, copia esta URL en el navegador:\n\n" + authUrl + "\n");
  execFile("open", [authUrl]);
});
