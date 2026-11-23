import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// Sin prefijo se asume España; con "+" vale cualquier país.
// Comprueba la longitud y la numeración real de cada país y rechaza números de relleno (600000000, 611111111…).
export function normalizePhone(raw) {
  const phone = parsePhoneNumberFromString(String(raw || "").trim(), "ES");
  if (!phone || !phone.isValid()) return null;
  if (/(\d)\1{6,}/.test(phone.nationalNumber)) return null;
  return phone.formatInternational();
}
