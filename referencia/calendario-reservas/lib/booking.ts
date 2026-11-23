// Motor de reservas: calcula huecos y crea citas directamente en Google Calendar.
// Solo se usa desde el servidor: las credenciales nunca llegan al navegador.
// Credenciales: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GOOGLE_REFRESH_TOKEN (scripts/google-auth.mjs).

export const BOOKING_DURATIONS = [30, 60] as const;
export type BookingDuration = (typeof BOOKING_DURATIONS)[number];

const RULES = {
  calendarId: "primary",
  timeZone: "Europe/Madrid",
  title: "Llamada de descubrimiento", // título del evento en el calendario
  buffer: 15, // minutos libres antes y después de cada cita
  minNoticeHours: 4, // antelación mínima para reservar
  maxDaysAhead: 14, // hasta cuántos días vista se puede reservar
  // Franjas por día de la semana (1 = lunes … 7 = domingo). Días sin entrada = cerrado.
  hours: {
    1: [["09:30", "13:00"], ["14:30", "18:00"]],
    2: [["09:30", "13:00"], ["14:30", "18:00"]],
    3: [["09:30", "13:00"], ["14:30", "18:00"]],
    4: [["09:30", "13:00"], ["14:30", "18:00"]],
    5: [["10:00", "13:00"], ["14:30", "16:00"]],
  } as Record<number, [string, string][]>,
};

export function isBookingDuration(value: unknown): value is BookingDuration {
  return BOOKING_DURATIONS.includes(Number(value) as BookingDuration);
}

export class BookingError extends Error {}

// --- Fechas en la zona horaria del calendario ---

const ymdFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: RULES.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const offsetFmt = new Intl.DateTimeFormat("en-US", { timeZone: RULES.timeZone, timeZoneName: "longOffset" });

function offsetMs(instant: number) {
  const name = offsetFmt.formatToParts(instant).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

// "2026-10-01" + "09:30" en hora de Madrid → instante UTC (tiene en cuenta el cambio de hora).
function zonedTime(ymd: string, hm: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const [h, min] = hm.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, h, min);
  const guess = wall - offsetMs(wall);
  return wall - offsetMs(guess);
}

function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function isoWeekday(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7;
}

// --- Google Calendar ---

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new BookingError("not_configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new BookingError("auth_failed");
  const data: { access_token: string; expires_in: number } = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function googleApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new BookingError("upstream_error");
  return res.json();
}

async function busyIntervals(from: number, to: number) {
  const data = await googleApi<{ calendars: Record<string, { busy?: { start: string; end: string }[] }> }>(
    "/freeBusy",
    {
      timeMin: new Date(from).toISOString(),
      timeMax: new Date(to).toISOString(),
      timeZone: RULES.timeZone,
      items: [{ id: RULES.calendarId }],
    }
  );
  return (data.calendars[RULES.calendarId]?.busy ?? []).map((b) => ({
    start: Date.parse(b.start),
    end: Date.parse(b.end),
  }));
}

// --- Reglas ---

export async function getSlots(duration: BookingDuration) {
  const now = Date.now();
  const earliest = now + RULES.minNoticeHours * 3_600_000;
  const today = ymdFmt.format(now);
  const length = duration * 60_000;

  const candidates: { start: number; end: number }[] = [];
  for (let i = 0; i <= RULES.maxDaysAhead; i++) {
    const ymd = addDays(today, i);
    for (const [from, to] of RULES.hours[isoWeekday(ymd)] ?? []) {
      const limit = zonedTime(ymd, to);
      for (let start = zonedTime(ymd, from); start + length <= limit; start += length + RULES.buffer * 60_000) {
        if (start >= earliest) candidates.push({ start, end: start + length });
      }
    }
  }
  if (!candidates.length) return [];

  const pad = RULES.buffer * 60_000;
  const busy = await busyIntervals(candidates[0].start - pad, candidates[candidates.length - 1].end + pad);
  return candidates
    .filter((c) => !busy.some((b) => c.start - pad < b.end && c.end + pad > b.start))
    .map((c) => new Date(c.start).toISOString());
}

export async function createBooking(input: {
  start: string;
  duration: BookingDuration;
  name: string;
  email: string;
  phone: string;
  business: string;
}) {
  const start = new Date(input.start);
  const available = await getSlots(input.duration);
  if (Number.isNaN(start.getTime()) || !available.includes(start.toISOString())) {
    throw new BookingError("slot_taken");
  }
  const end = new Date(start.getTime() + input.duration * 60_000);

  const event = await googleApi<{ id: string; hangoutLink?: string }>(
    `/calendars/${encodeURIComponent(RULES.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      summary: `${RULES.title} · ${input.name}`,
      description:
        `Nombre: ${input.name}\nEmail: ${input.email}\nTeléfono: ${input.phone}\n\nSobre su negocio:\n${input.business}` +
        "\n\nReservado desde tuweb.com",
      start: { dateTime: start.toISOString(), timeZone: RULES.timeZone },
      end: { dateTime: end.toISOString(), timeZone: RULES.timeZone },
      attendees: [{ email: input.email, displayName: input.name }],
      conferenceData: {
        createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
      reminders: { useDefault: true },
    }
  );

  return {
    ok: true as const,
    eventId: event.id,
    start: start.toISOString(),
    end: end.toISOString(),
    meetLink: event.hangoutLink ?? null,
  };
}
