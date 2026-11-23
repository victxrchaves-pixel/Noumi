// POST /api/booking → crea la llamada en Google Calendar con Meet y envía la invitación.
import { BookingError, DURATION, GOALS, createBooking } from "../_lib/booking.js";
import { normalizePhone } from "../_lib/phone.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const text = (value, max) => String(value ?? "").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  res.setHeader("Cache-Control", "no-store");

  const body = req.body && typeof req.body === "object" ? req.body : null;
  if (!body) return res.status(400).json({ error: "bad_request" });

  // Campo trampa: las personas no lo ven, los robots lo rellenan.
  if (body.website) return res.status(400).json({ error: "bad_request" });

  const input = {
    start: text(body.start, 40),
    name: text(body.name, 100),
    email: text(body.email, 200),
    goal: text(body.goal, 20),
    budget: text(body.budget, 60),
    ticket: text(body.ticket, 60),
    web: text(body.web, 200),
    message: text(body.message, 2000),
    source: text(body.source, 60),
  };

  if (
    Number(body.duration) !== DURATION ||
    !input.start ||
    input.name.length < 2 ||
    !EMAIL_RE.test(input.email) ||
    !GOALS[input.goal] ||
    !input.budget ||
    !input.ticket
  ) {
    return res.status(400).json({ error: "invalid_fields" });
  }
  input.phone = normalizePhone(body.phone);
  if (!input.phone) return res.status(400).json({ error: "invalid_phone" });

  try {
    return res.status(200).json(await createBooking(input));
  } catch (err) {
    const code = err instanceof BookingError ? err.message : "unknown";
    if (code !== "slot_taken") console.error("booking_create_failed", code);
    return res.status(code === "slot_taken" ? 409 : 502).json({ error: code });
  }
}
