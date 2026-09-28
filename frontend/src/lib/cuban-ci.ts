/**
 * Value Object: CubanIdentityNumber (Carné de Identidad cubano)
 *
 * Formato: 11 dígitos YYMMDDCCCCN donde:
 *  - YY: año de nacimiento (2 dígitos)
 *  - MM: mes de nacimiento (2 dígitos, 01-12)
 *  - DD: día de nacimiento (2 dígitos, 01-31)
 *  - CCCC: secuencia (4 dígitos)
 *  - N: dígito verificador (validado por el backend, NO por el frontend)
 *
 * Encoding del siglo (primer dígito del CI):
 *  - 0-4: nacido en el siglo XXI (2000-2099)
 *  - 5-9: nacido en el siglo XX (1900-1999)
 *
 * NOTA: El dígito verificador NO se valida en el frontend.
 * El backend SGP tiene el algoritmo oficial cubano (RF-SEG-001) y lo valida
 * server-side. El frontend solo valida formato + fecha básica.
 */

const CI_REGEX = /^\d{11}$/;

export type CIValidationError = 'invalid_format' | 'invalid_birth_date';

/**
 * Valida un número de identidad cubano (11 dígitos).
 *
 * @returns true si es válido, false en caso contrario
 */
export function isValidCubanCI(ci: string): boolean {
  return validateCubanCI(ci) === null;
}

/**
 * Valida un número de identidad cubano y retorna el error específico.
 * NO valida el dígito verificador (esa validación la hace el backend).
 *
 * @returns null si es válido, o el código de error específico
 */
export function validateCubanCI(ci: string): CIValidationError | null {
  // 1. Formato: 11 dígitos
  if (!ci || !CI_REGEX.test(ci)) {
    return 'invalid_format';
  }

  // 2. Fecha de nacimiento válida (dígitos 0-5 = YYMMDD)
  const yy = parseInt(ci.substring(0, 2), 10);
  const mm = parseInt(ci.substring(2, 4), 10);
  const dd = parseInt(ci.substring(4, 6), 10);

  // Siglo: primer dígito 0-4 → siglo XXI (2000s), 5-9 → siglo XX (1900s)
  const firstDigit = parseInt(ci.charAt(0), 10);
  const fullYear = firstDigit <= 4 ? 2000 + yy : 1900 + yy;

  // Validar mes
  if (mm < 1 || mm > 12) {
    return 'invalid_birth_date';
  }
  // Validar día (simplificado — no valida días por mes ni bisiestos)
  if (dd < 1 || dd > 31) {
    return 'invalid_birth_date';
  }
  // Construir fecha para validarla
  const birthDate = new Date(fullYear, mm - 1, dd);
  if (isNaN(birthDate.getTime())) {
    return 'invalid_birth_date';
  }
  // Sanity check: la fecha no puede ser futura
  if (birthDate > new Date()) {
    return 'invalid_birth_date';
  }

  return null;
}

/**
 * Extrae la fecha de nacimiento del CI.
 */
export function getBirthDateFromCI(ci: string): Date | null {
  if (!isValidCubanCI(ci)) return null;
  const yy = parseInt(ci.substring(0, 2), 10);
  const mm = parseInt(ci.substring(2, 4), 10);
  const dd = parseInt(ci.substring(4, 6), 10);
  const firstDigit = parseInt(ci.charAt(0), 10);
  const fullYear = firstDigit <= 4 ? 2000 + yy : 1900 + yy;
  return new Date(fullYear, mm - 1, dd);
}

/**
 * Formatea el CI para mostrar (con separadores legibles).
 * Ej: "85061547812" → "85 0615 4781 2"
 */
export function formatCI(ci: string): string {
  if (!ci || ci.length !== 11) return ci;
  return `${ci.substring(0, 2)} ${ci.substring(2, 6)} ${ci.substring(6, 10)} ${ci.substring(10)}`;
}

/**
 * Mensajes de error legibles por código de validación.
 */
export const CI_ERROR_MESSAGES_ES: Record<CIValidationError, string> = {
  invalid_format: 'El CI debe tener 11 dígitos numéricos',
  invalid_birth_date: 'La fecha de nacimiento codificada en el CI es inválida',
};

export const CI_ERROR_MESSAGES_EN: Record<CIValidationError, string> = {
  invalid_format: 'The ID must have 11 numeric digits',
  invalid_birth_date: 'The birth date encoded in the ID is invalid',
};
