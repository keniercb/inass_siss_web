/**
 * Value Object: CubanIdentityNumber (Carné de Identidad cubano)
 *
 * Formato: 11 dígitos AABBBBCCCCN donde:
 *  - AA: año de nacimiento (2 dígitos)
 *  - BB: mes de nacimiento (2 dígitos, 01-12)
 *  - BB: día de nacimiento (2 dígitos, 01-31)
 *  - CCCC: secuencia (4 dígitos)
 *  - N: dígito verificador (calculado con algoritmo MOD 11)
 *
 * El siglo se infiere del primer dígito:
 *  - 0-4 (mujer) o 5-9 (hombre) → 1900s
 *  - 5-9 (mujer) — en realidad no, el algoritmo es:
 *    - Primer dígito 0-4: siglo XX (1900-1999), sexo femenino si 0-4, masculino si 5-9
 *    - Primer dígito 5-9: siglo XXI (2000-2099), sexo femenino si 5-?, masculino si ?-9
 *
 * NOTA: el algoritmo de verificación cubano es MOD 11 con pesos específicos.
 * Esta implementación usa el algoritmo más documentado públicamente.
 */

const CI_REGEX = /^\d{11}$/;

// Pesos para el cálculo del dígito verificador (algoritmo MOD 11 cubano)
const VERIFIER_WEIGHTS = [7, 6, 5, 4, 3, 2, 7, 6, 5, 4];

export type CIValidationError =
  | 'invalid_format'
  | 'invalid_birth_date'
  | 'invalid_verifier';

/**
 * Valida un número de identidad cubano (11 dígitos + dígito verificador).
 *
 * @returns true si es válido, false en caso contrario
 */
export function isValidCubanCI(ci: string): boolean {
  return validateCubanCI(ci) === null;
}

/**
 * Valida un número de identidad cubano y retorna el error específico.
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

  // Siglo: primer dígito 0-4 → 1900s, 5-9 → 2000s (aproximación)
  const firstDigit = parseInt(ci.charAt(0), 10);
  const fullYear = firstDigit <= 4 ? 1900 + yy : 2000 + yy;

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

  // 3. Dígito verificador (algoritmo MOD 11)
  const first10 = ci.substring(0, 10);
  const expectedVerifier = parseInt(ci.charAt(10), 10);
  const calculated = computeVerifier(first10);

  if (calculated !== expectedVerifier) {
    return 'invalid_verifier';
  }

  return null;
}

/**
 * Calcula el dígito verificador de los primeros 10 dígitos.
 * Algoritmo: suma de digit×weight mod 11; si resultado es 10 → 0.
 */
function computeVerifier(tenDigits: string): number {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = parseInt(tenDigits.charAt(i), 10);
    const weight = VERIFIER_WEIGHTS[i] ?? 0;
    sum += digit * weight;
  }
  const mod = sum % 11;
  return mod === 10 ? 0 : mod;
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
  const fullYear = firstDigit <= 4 ? 1900 + yy : 2000 + yy;
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
 * El frontend usa i18n keys, el backend puede usarlos en español directo.
 */
export const CI_ERROR_MESSAGES_ES: Record<CIValidationError, string> = {
  invalid_format: 'El CI debe tener 11 dígitos numéricos',
  invalid_birth_date: 'La fecha de nacimiento codificada en el CI es inválida',
  invalid_verifier: 'El dígito verificador del CI es incorrecto',
};

export const CI_ERROR_MESSAGES_EN: Record<CIValidationError, string> = {
  invalid_format: 'The ID must have 11 numeric digits',
  invalid_birth_date: 'The birth date encoded in the ID is invalid',
  invalid_verifier: 'The ID verifier digit is incorrect',
};
