import { z } from 'zod';
import type { components } from '@/types/api';

// Tipo del recurso desde OpenAPI
export type GeneralSettingVersion = Required<components['schemas']['GeneralSettingVersion']>;

// Schema Zod para crear una nueva versión (Task 55/S9.1: doctrina 2026)
// Los 6 campos viejos (min_work_years, min_age_men/women, base/max_calc_percent,
// annual_increase_percent, effective_from) fueron RETIRADOS — 422 si llegan.
// effective_from NO se envía: lo sella el servidor al publicar.
export const createSettingSchema = z.object({
  combatant_threshold_date: z.string().min(1, 'La fecha umbral es obligatoria'),
  pre_threshold_percent: z.coerce.number().min(0, 'Debe ser ≥ 0').max(1, 'Debe ser ≤ 1'),
  post_threshold_percent: z.coerce.number().min(0, 'Debe ser ≥ 0').max(1, 'Debe ser ≤ 1'),
  internationalist_increment: z.coerce.number().min(0, 'Debe ser ≥ 0'),
  minimum_pension: z.coerce.number().min(0, 'Debe ser ≥ 0'),
  maximum_pension: z.coerce.number().min(0, 'Debe ser ≥ 0'),
  minimum_pension_increment: z.coerce.number().min(0, 'Debe ser ≥ 0'),
  // Task 70/SGP-54: calendario de cobro (3 campos enteros)
  payment_day: z.coerce.number().int().min(1, 'Debe estar entre 1 y 30').max(30, 'Debe estar entre 1 y 30'),
  month_to_provitional: z.coerce.number().int().min(1, 'Debe ser > 0'),
  month_to_expired: z.coerce.number().int().min(1, 'Debe ser > 0'),
});

// Refinamiento: maximum_pension >= minimum_pension
export const createSettingSchemaWithValidation = createSettingSchema.refine(
  (data) => data.maximum_pension >= data.minimum_pension,
  {
    message: 'La pensión máxima debe ser mayor o igual que la mínima',
    path: ['maximum_pension'],
  },
);

export type CreateSettingInput = z.infer<typeof createSettingSchemaWithValidation>;

// Helper para formatear fechas — delega al formatDate central de lib/utils.ts
// para evitar el off-by-one del parsing UTC en cadenas date-only ('YYYY-MM-DD').
import { formatDate } from '@/lib/utils';
export function formatEffectiveDate(dateStr: string, locale = 'es-CU'): string {
  return formatDate(dateStr, locale);
}
