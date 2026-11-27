import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Helper para combinar clases TailwindCSS sin conflictos */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un importe como moneda CUP */
export function formatCUP(amount: number): string {
  return new Intl.NumberFormat('es-CU', {
    style: 'currency',
    currency: 'CUP',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Fuente de nombre aceptada por personFullName: tanto proyecciones que traen
 * `full_name` listo (p. ej. el pensionado/beneficiario anidado de un instrumento
 * de pago, la firma autorizada) como la persona completa (GET /people, person
 * anidado del pensionado) que trae los componentes sueltos.
 */
export interface PersonNameSource {
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  first_surname?: string | null;
  second_surname?: string | null;
}

/**
 * Nombre completo de una persona a partir de las proyecciones de la API.
 *
 * Si la proyección trae `full_name` se usa tal cual; en caso contrario se
 * compone con la convención de la app (apellidos primero, luego nombres):
 * primer apellido, segundo apellido, primer nombre, segundo nombre.
 * Devuelve '' si no hay componentes — el llamador decide el fallback ('—', '#id').
 */
export function personFullName(person?: PersonNameSource | null): string {
  if (!person) return '';
  if (person.full_name) return person.full_name;
  return [person.first_surname, person.second_surname, person.first_name, person.middle_name]
    .filter(Boolean)
    .join(' ');
}

/**
 * Formatea una fecha ISO a DD/MM/YYYY (es-CU por defecto).
 *
 * TRATAMIENTO DE DATE-ONLY vs DATETIME:
 *  - Las cadenas date-only ('YYYY-MM-DD', 10 chars) se interpretan como fecha LOCAL
 *    (anexando 'T00:00:00') para evitar el off-by-one del parsing UTC. Esto es lo
 *    correcto para fechas de nacimiento, fechas de solicitud, fechas de dictamen,
 *    fechas de salario (año), etc. — el "día" es el día civil, sin componente horario.
 *  - Las cadenas datetime con TZ ('2026-09-20T10:00:00Z' o con offset) se pasan tal
 *    cual a new Date(), que las interpreta como UTC instant y las formatea en la
 *    zona local del navegador — el comportamiento esperado para timestamps (created_at,
 *    changed_at, decided_at).
 *  - Los objetos Date se usan directamente.
 */
export function formatDate(isoDate: string | Date, locale = 'es-CU'): string {
  let date: Date;
  if (typeof isoDate === 'string') {
    // Date-only ('YYYY-MM-DD' exactamente 10 chars) → interpretar como LOCAL.
    // Cualquier otra cadena (con T, Z o offset) → interpretar como instante UTC/TZ.
    date = isoDate.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)
      ? new Date(isoDate + 'T00:00:00')
      : new Date(isoDate);
  } else {
    date = isoDate;
  }
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** Genera un UUID v4 (para Idempotency-Key) */
export function uuidv4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback (navegadores antiguos)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
