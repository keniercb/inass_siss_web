import { z } from 'zod';
import type { components } from '@/types/api';

// Tipo del recurso desde OpenAPI
export type GeneralSettingVersion = Required<components['schemas']['GeneralSettingVersion']>;

// Schema Zod para crear una nueva vigencia
export const createSettingSchema = z.object({
  min_work_years: z.number().int().min(0, 'Los años mínimos deben ser ≥ 0'),
  min_age_men: z.number().int().min(0, 'La edad mínima debe ser ≥ 0'),
  min_age_women: z.number().int().min(0, 'La edad mínima debe ser ≥ 0'),
  base_calc_percent: z.number().int().min(0).max(100, 'Debe estar entre 0 y 100'),
  max_calc_percent: z.number().int().min(0).max(100, 'Debe estar entre 0 y 100'),
  annual_increase_percent: z.number().int().min(0).max(100, 'Debe estar entre 0 y 100'),
  effective_from: z.string().min(1, 'La fecha de vigencia es obligatoria'),
});

// Refinamiento: max_calc_percent >= base_calc_percent
export const createSettingSchemaWithValidation = createSettingSchema.refine(
  (data) => data.max_calc_percent >= data.base_calc_percent,
  {
    message: 'El porcentaje máximo debe ser mayor o igual al porcentaje base',
    path: ['max_calc_percent'],
  },
);

export type CreateSettingInput = z.infer<typeof createSettingSchemaWithValidation>;

// Helper para formatear fechas
export function formatEffectiveDate(dateStr: string, locale = 'es-CU'): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}
