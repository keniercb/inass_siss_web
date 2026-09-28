/**
 * Value Object: CubanIdentityNumber (Carné de Identidad cubano)
 *
 * El frontend SOLO valida el formato (11 dígitos numéricos).
 * Toda la validación sustantiva (fecha de nacimiento, dígito verificador, unicidad)
 * la hace el backend con el algoritmo oficial cubano (RF-SEG-001).
 *
 * Encoding del siglo (para extracción/display, NO para validación):
 *  - Primer dígito 0-4: nacido en el siglo XXI (2000-2099)
 *  - Primer dígito 5-9: nacido en el siglo XX (1900-1999)
 */

const CI_REGEX = /^\d{11}$/;

/**
 * Valida que el CI tenga 11 dígitos numéricos.
 * No valida fecha ni dígito verificador — eso lo hace el backend.
 */
export function isValidCubanCI(ci: string): boolean {
  return !!ci && CI_REGEX.test(ci);
}

/**
 * Extrae la fecha de nacimiento del CI (para display).
 * NO se usa para validación — solo para mostrar la fecha derivada en el detalle.
 */
export function getBirthDateFromCI(ci: string): Date | null {
  if (!isValidCubanCI(ci)) return null;
  const yy = parseInt(ci.substring(0, 2), 10);
  const mm = parseInt(ci.substring(2, 4), 10);
  const dd = parseInt(ci.substring(4, 6), 10);
  const firstDigit = parseInt(ci.charAt(0), 10);
  const fullYear = firstDigit <= 4 ? 2000 + yy : 1900 + yy;
  const date = new Date(fullYear, mm - 1, dd);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formatea el CI para mostrar (con separadores legibles).
 * Ej: "85061547812" → "85 0615 4781 2"
 */
export function formatCI(ci: string): string {
  if (!ci || ci.length !== 11) return ci;
  return `${ci.substring(0, 2)} ${ci.substring(2, 6)} ${ci.substring(6, 10)} ${ci.substring(10)}`;
}
