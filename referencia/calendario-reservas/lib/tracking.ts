declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
    oaiq?: (...args: unknown[]) => void;
  }
}

function sanitizeEventId(raw: string | undefined) {
  const clean = String(raw || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return clean || `lead_${Date.now()}`;
}

function showConversionToast(eventName: string) {
  const toast = document.createElement("div");
  toast.textContent = `Conversión enviada: ${eventName}`;
  toast.style.cssText =
    "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);" +
    "background:#111;color:#fff;padding:10px 16px;border-radius:8px;" +
    "font:500 13px/1.4 system-ui,sans-serif;z-index:2147483647;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.3);opacity:0;transition:opacity .2s;";
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// La conversión real es la reserva confirmada en el calendario.
// El id del evento de Google sirve de event_id para deduplicar con futuras llamadas de servidor.
export function trackLeadCreated(rawEventId: string | undefined) {
  const eventId = sanitizeEventId(rawEventId);
  window.dataLayer?.push({ event: "lead_created", event_id: eventId });
  window.fbq?.("track", "Lead", {}, { eventID: eventId });
  window.oaiq?.("measure", "lead_created", { type: "customer_action" }, { event_id: eventId });
  showConversionToast("lead_created");
}
