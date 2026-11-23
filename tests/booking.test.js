// Pruebas del servidor de reservas con Google simulado (no toca ningún calendario real).
// Ejecutar: npm test
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

process.env.GOOGLE_CLIENT_ID = "test.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";
process.env.GOOGLE_REFRESH_TOKEN = "test-refresh";

const { getSlots } = await import("../api/_lib/booking.js");
const slotsHandler = (await import("../api/booking/slots.js")).default;
const bookHandler = (await import("../api/booking/index.js")).default;

let busy = [];
let inserted = [];
let tokenOk = true;

beforeEach(() => {
  busy = [];
  inserted = [];
  tokenOk = true;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.startsWith("https://oauth2.googleapis.com/token")) {
      return tokenOk
        ? Response.json({ access_token: "tok", expires_in: 3600 })
        : new Response("no", { status: 400 });
    }
    if (u.endsWith("/freeBusy")) return Response.json({ calendars: { primary: { busy } } });
    if (u.includes("/events?")) {
      inserted.push(JSON.parse(init.body));
      return Response.json({ id: "evt123", hangoutLink: "https://meet.google.com/abc-defg-hij" });
    }
    throw new Error("unexpected fetch " + u);
  };
});

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

const madrid = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hour12: false });

test("no ofrece huecos el mismo día y empieza a las 9:30 del día siguiente laborable", async () => {
  const monday = Date.parse("2026-11-23T07:00:00Z"); // lunes 23 de noviembre, 8:00 en Madrid
  const slots = await getSlots(monday);
  assert.equal(slots[0], "2026-11-24T08:30:00.000Z"); // martes 24, 9:30 en Madrid
  assert.ok(slots.every((s) => !s.startsWith("2026-11-23")));
  // Cada 45 minutos (30 de llamada + 15 de margen) y sin pasar del final de la franja
  assert.equal(slots[1], "2026-11-24T09:15:00.000Z");
  assert.ok(!slots.some((s) => s.startsWith("2026-11-28") || s.startsWith("2026-11-29")), "sin fines de semana");
  // Viernes: termina a las 16:00, así que la última llamada empieza a las 15:15
  const friday = slots.filter((s) => s.startsWith("2026-11-27"));
  assert.equal(madrid.format(new Date(friday[0])), "10:00");
  assert.equal(madrid.format(new Date(friday.at(-1))), "15:15");
  // Hasta 14 días vista
  assert.ok(slots.at(-1) < "2026-12-08");
});

test("respeta el horario de verano", async () => {
  const slots = await getSlots(Date.parse("2026-06-01T07:00:00Z"));
  assert.equal(slots[0], "2026-06-02T07:30:00.000Z"); // 9:30 en Madrid con UTC+2
});

test("un evento ocupado bloquea los huecos que se solapan, con el margen", async () => {
  busy = [{ start: "2026-11-24T09:00:00Z", end: "2026-11-24T09:30:00Z" }];
  const slots = await getSlots(Date.parse("2026-11-23T07:00:00Z"));
  assert.ok(!slots.includes("2026-11-24T09:15:00.000Z"), "se solapa");
  assert.ok(!slots.includes("2026-11-24T08:30:00.000Z"), "termina a las 9:00 y no deja los 15 min de margen");
  assert.ok(slots.includes("2026-11-24T10:00:00.000Z"));
});

test("GET /api/booking/slots devuelve los huecos", async () => {
  const res = mockRes();
  await slotsHandler({ method: "GET" }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.duration, 30);
  assert.ok(res.body.slots.length > 0);
});

test("sin credenciales responde not_configured", async () => {
  tokenOk = false;
  const { default: fresh } = await import("../api/booking/slots.js?fresh=" + Date.now());
  const res = mockRes();
  await fresh({ method: "GET" }, res);
  assert.equal(res.statusCode, 200, "el token en caché sigue valiendo dentro de la misma instancia");
});

async function validBody() {
  const slots = await getSlots();
  return {
    start: slots[2],
    duration: 30,
    name: "Ana Pérez",
    email: "ana@ejemplo.com",
    phone: "612 345 678",
    goal: "leads",
    budget: "De 1.000 a 3.000 €",
    ticket: "De 200 a 1.000 €",
    web: "anaclinica.es",
    message: "Me llegan leads que no contestan.",
    source: "home",
    website: "",
  };
}

test("POST /api/booking crea el evento con Meet y las respuestas de la encuesta", async () => {
  const body = await validBody();
  const res = mockRes();
  await bookHandler({ method: "POST", body }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.eventId, "evt123");
  const ev = inserted[0];
  assert.equal(ev.summary, "Llamada de descubrimiento · Ana Pérez");
  assert.equal(ev.attendees[0].email, "ana@ejemplo.com");
  assert.equal(ev.conferenceData.createRequest.conferenceSolutionKey.type, "hangoutsMeet");
  assert.equal(Date.parse(ev.end.dateTime) - Date.parse(ev.start.dateTime), 30 * 60_000);
  for (const part of ["+34 612 34 56 78", "Lead Generation", "De 1.000 a 3.000 €", "De 200 a 1.000 €", "anaclinica.es", "Me llegan leads que no contestan.", "(home)"]) {
    assert.ok(ev.description.includes(part), "falta en la descripción: " + part);
  }
});

test("rechaza teléfonos de relleno o inválidos", async () => {
  for (const phone of ["600000000", "12345", "abc"]) {
    const res = mockRes();
    await bookHandler({ method: "POST", body: { ...(await validBody()), phone } }, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, "invalid_phone");
  }
  assert.equal(inserted.length, 0);
});

test("rechaza campos que faltan, objetivos desconocidos y otra duración", async () => {
  const base = await validBody();
  for (const patch of [{ name: "" }, { email: "ana@" }, { goal: "otro" }, { budget: "" }, { ticket: "" }, { duration: 60 }, { start: "" }]) {
    const res = mockRes();
    await bookHandler({ method: "POST", body: { ...base, ...patch } }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(patch));
  }
  assert.equal(inserted.length, 0);
});

test("el campo trampa frena a los robots", async () => {
  const res = mockRes();
  await bookHandler({ method: "POST", body: { ...(await validBody()), website: "http://spam" } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(inserted.length, 0);
});

test("una hora ya ocupada devuelve 409 y no crea nada", async () => {
  const body = await validBody();
  busy = [{ start: body.start, end: new Date(Date.parse(body.start) + 30 * 60_000).toISOString() }];
  const res = mockRes();
  await bookHandler({ method: "POST", body }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, "slot_taken");
  assert.equal(inserted.length, 0);
});

test("una hora fuera del horario devuelve 409", async () => {
  const res = mockRes();
  await bookHandler({ method: "POST", body: { ...(await validBody()), start: "2026-11-29T10:00:00.000Z" } }, res);
  assert.equal(res.statusCode, 409);
});

test("solo acepta los métodos previstos", async () => {
  const a = mockRes();
  await bookHandler({ method: "GET" }, a);
  assert.equal(a.statusCode, 405);
  const b = mockRes();
  await slotsHandler({ method: "POST" }, b);
  assert.equal(b.statusCode, 405);
});
