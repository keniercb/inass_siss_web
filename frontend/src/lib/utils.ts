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

/** Formatea una fecha ISO a DD/MM/YYYY (es-CU) */
export function formatDate(isoDate: string | Date, locale = 'es-CU'): string {
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Calcula los meses trabajados entre dos fechas (inclusive ambos extremos).
 * Convención: el mes de inicio y el mes de fin cuentan como meses completos.
 * Ej: 2010-01-01 → 2024-12-31 = 180 meses (15 años × 12).
 * Devuelve null si alguna fecha falta o end < start.
 */
export function workedMonths(startIso?: string | null, endIso?: string | null): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return null;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  return months < 0 ? 0 : months;
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
