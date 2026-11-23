// Motor de reservas de Noumi: calcula los huecos libres y crea las citas en Google Calendar.
// Solo se ejecuta en el servidor (funciones de Vercel). Las credenciales vienen de las variables de entorno
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN y nunca llegan al navegador.
// Adaptado de referencia/calendario-reservas/lib/booking.ts.

export const DURATION = 30; // minutos

// Las mismas reglas que prototipo/js/booking.js (si cambias una, cambia la otra).
export const RULES = {
  calendarId: "primary", // el calendario principal de noumiconsultant@gmail.com
  timeZone: "Europe/Madrid",
  title: "Llamada con Noumi Consultant", // título del evento y del asunto de la invitación
  buffer: 15, // minutos libres entre llamadas
  minDaysAhead: 1, // no se puede reservar para el mismo día
  maxDaysAhead: 14, // hasta cuántos días vista
  // 1 = lunes … 7 = domingo. Días sin entrada = cerrado.
  hours: {
    1: [["09:30", "13:00"], ["14:30", "18:00"]],
    2: [["09:30", "13:00"], ["14:30", "18:00"]],
    3: [["09:30", "13:00"], ["14:30", "18:00"]],
    4: [["09:30", "13:00"], ["14:30", "18:00"]],
    5: [["10:00", "13:00"], ["14:30", "16:00"]],
  },
};

export const GOALS = {
  commerce: "E-Commerce Growth (vender productos online)",
  leads: "Lead Generation (conseguir clientes para un servicio)",
  web: "Diseño web (una web nueva o mejor)",
};

export class BookingError extends Error {}

// --- Fechas en la zona horaria del calendario ---

const ymdFmt = new Intl.DateTimeFormat("en-CA", { timeZone: RULES.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
const offsetFmt = new Intl.DateTimeFormat("en-US", { timeZone: RULES.timeZone, timeZoneName: "longOffset" });

function offsetMs(instant) {
  const name = offsetFmt.formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) * 60_000;
}

// "2026-12-01" + "09:30" en hora de Madrid → instante UTC (incluye el cambio de hora)
function zonedTime(ymd, hm) {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  return wall - offsetMs(wall - offsetMs(wall));
}

function addDays(ymd, days) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function isoWeekday(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

// --- Google Calendar ---

let cachedToken = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) throw new BookingError("not_configured");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new BookingError("auth_failed");
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function googleApi(path, body) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new BookingError("upstream_error");
  return res.json();
}

async function busyIntervals(from, to) {
  const data = await googleApi("/freeBusy", {
    timeMin: new Date(from).toISOString(),
    timeMax: new Date(to).toISOString(),
    timeZone: RULES.timeZone,
    items: [{ id: RULES.calendarId }],
  });
  return (data.calendars?.[RULES.calendarId]?.busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

// --- Huecos y reservas ---

export async function getSlots(now = Date.now()) {
  const today = ymdFmt.format(now);
  const length = DURATION * 60_000;
  const step = (DURATION + RULES.buffer) * 60_000;

  const candidates = [];
  for (let i = RULES.minDaysAhead; i <= RULES.maxDaysAhead; i++) {
    const ymd = addDays(today, i);
    for (const [from, to] of RULES.hours[isoWeekday(ymd)] ?? []) {
      const limit = zonedTime(ymd, to);
      for (let start = zonedTime(ymd, from); start + length <= limit; start += step) {
        candidates.push({ start, end: start + length });
      }
    }
  }
  if (!candidates.length) return [];

  // Cualquier evento marcado como "Ocupado" en el calendario bloquea los huecos que se solapan (con el margen).
  const pad = RULES.buffer * 60_000;
  const busy = await busyIntervals(candidates[0].start - pad, candidates[candidates.length - 1].end + pad);
  return candidates
    .filter((c) => !busy.some((b) => c.start - pad < b.end && c.end + pad > b.start))
    .map((c) => new Date(c.start).toISOString());
}

function describe(input) {
  const lines = [
    "Llamada de descubrimiento de 30 minutos por Google Meet.",
    "",
    `Nombre: ${input.name} ${input.lastName}`,
    `Email: ${input.email}`,
    `Teléfono: ${input.phone}`,
    "",
    `Empresa o marca: ${input.company}`,
    `Qué necesita: ${GOALS[input.goal]}`,
    `Inversión mensual en publicidad: ${input.budget}`,
    `Ticket medio o valor de un cliente: ${input.ticket}`,
    `Web: ${input.web || "No tiene o no la ha indicado"}`,
    `Red social: ${input.social || "No la ha indicado"}`,
  ];
  if (input.message) lines.push("", "Qué le preocupa:", input.message);
  lines.push("", `Reservado desde la web de Noumi Consultant (${input.source || "web"}).`);
  return lines.join("\n");
}

export async function createBooking(input) {
  const start = new Date(input.start);
  // Se vuelve a comprobar el hueco justo antes de crear la cita, para que dos personas no reserven la misma hora.
  const available = await getSlots();
  if (Number.isNaN(start.getTime()) || !available.includes(start.toISOString())) throw new BookingError("slot_taken");
  const end = new Date(start.getTime() + DURATION * 60_000);

  const event = await googleApi(
    `/calendars/${encodeURIComponent(RULES.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      summary: RULES.title,
      description: describe(input),
      start: { dateTime: start.toISOString(), timeZone: RULES.timeZone },
      end: { dateTime: end.toISOString(), timeZone: RULES.timeZone },
      attendees: [{ email: input.email, displayName: `${input.name} ${input.lastName}` }],
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } } },
      reminders: { useDefault: true },
    }
  );

  return { ok: true, eventId: event.id, start: start.toISOString(), end: end.toISOString(), meetLink: event.hangoutLink ?? null };
}
