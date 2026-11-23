// GET /api/booking/slots → { duration: 30, slots: ["2026-12-01T08:30:00.000Z", …] }
import { BookingError, DURATION, getSlots } from "../_lib/booking.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });
  res.setHeader("Cache-Control", "no-store");
  try {
    return res.status(200).json({ duration: DURATION, slots: await getSlots() });
  } catch (err) {
    const code = err instanceof BookingError ? err.message : "unknown";
    console.error("booking_slots_failed", code);
    return res.status(502).json({ error: code });
  }
}
