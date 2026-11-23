import { BookingError, getSlots, isBookingDuration } from "@/lib/booking";

export async function GET(request: Request) {
  const duration = Number(new URL(request.url).searchParams.get("duration"));
  if (!isBookingDuration(duration)) {
    return Response.json({ error: "invalid_duration" }, { status: 400 });
  }

  try {
    return Response.json({ duration, slots: await getSlots(duration) });
  } catch (err) {
    const code = err instanceof BookingError ? err.message : "unknown";
    return Response.json({ error: code }, { status: 502 });
  }
}
