import { parsePhoneNumberFromString } from "libphonenumber-js/max";

// Sin prefijo se asume España; con "+" vale cualquier país.
// Usa los metadatos completos: comprueba longitud y numeración real de cada país
// (p. ej. en España 9 dígitos que empiecen por 6, 7, 8 o 9).
export function normalizePhone(raw: string): string | null {
  const phone = parsePhoneNumberFromString(raw.trim(), "ES");
  if (!phone || !phone.isValid()) return null;

  // Descarta números de relleno evidentes: 600000000, 611111111…
  if (/(\d)\1{6,}/.test(phone.nationalNumber)) return null;

  return phone.formatInternational();
}
