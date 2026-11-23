import { BookingError, createBooking, isBookingDuration } from "@/lib/booking";
import { normalizePhone } from "@/lib/phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Campo trampa: las personas no lo ven, los bots lo rellenan.
  if (body.website) return Response.json({ error: "bad_request" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const business = String(body.business ?? "").trim();
  const start = String(body.start ?? "");
  const duration = Number(body.duration);

  if (!name || !business || !EMAIL_RE.test(email) || !isBookingDuration(duration) || !start) {
    return Response.json({ error: "invalid_fields" }, { status: 400 });
  }
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return Response.json({ error: "invalid_phone" }, { status: 400 });

  try {
    const result = await createBooking({
      duration,
      start,
      name: name.slice(0, 100),
      email: email.slice(0, 200),
      phone: normalizedPhone,
      business: business.slice(0, 2000),
    });
    return Response.json(result);
  } catch (err) {
    const code = err instanceof BookingError ? err.message : "unknown";
    const status = code === "slot_taken" ? 409 : 502;
    return Response.json({ error: code }, { status });
  }
}
