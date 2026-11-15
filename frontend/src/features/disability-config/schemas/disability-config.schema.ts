import { z } from 'zod';
import type { components } from '@/types/api';

export type DisabilityRule = components['schemas']['DisabilityRule'];
export type DisabilityIncrementBracket = components['schemas']['DisabilityIncrementBracket'];
export type SpecialDisabilityModification = components['schemas']['SpecialDisabilityModification'];
export type BeneficiaryRule = components['schemas']['BeneficiaryRule'];

// Los 5 orígenes de la regla de invalidez — incluye 'fallecimiento' (Task 76 confirmación 5.1)
export const DISABILITY_ORIGINS = ['comun', 'profesional', 'accidente_trabajo', 'accidente_trayecto', 'fallecimiento'] as const;
export type DisabilityOrigin = (typeof DISABILITY_ORIGINS)[number];

// Tramo de incremento — anidado en DisabilityRule.brackets
export const disabilityIncrementBracketSchema = z.object({
  id: z.number().int().positive().optional(),
  min_years: z.number().int().min(0, 'Los años mínimos deben ser ≥ 0'),
  max_years: z.number().int().nullable().optional(),
  annual_increment_percent: z.number().min(0).max(100, 'El porciento debe estar entre 0 y 100'),
}).superRefine((data, ctx) => {
  if (data.max_years != null && data.max_years < data.min_years) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['max_years'],
      message: 'El año máximo debe ser mayor o igual al mínimo',
    });
  }
});
export type DisabilityIncrementBracketInput = z.infer<typeof disabilityIncrementBracketSchema>;

// Regla de invalidez por origen — un origen → una regla
export const createDisabilityRuleSchema = z.object({
  origin: z.enum(DISABILITY_ORIGINS),
  base_percent: z.string().min(1, 'El porciento base es obligatorio'),
  increment_percent: z.string().min(1, 'El porciento de incremento es obligatorio'),
  brackets: z.array(disabilityIncrementBracketSchema).default([]),
});
export type CreateDisabilityRuleInput = z.infer<typeof createDisabilityRuleSchema>;

export const updateDisabilityRuleSchema = z.object({
  base_percent: z.string().min(1).optional(),
  increment_percent: z.string().min(1).optional(),
  brackets: z.array(disabilityIncrementBracketSchema).optional(),
});
export type UpdateDisabilityRuleInput = z.infer<typeof updateDisabilityRuleSchema>;

// Modificación especial nominada
export const createSpecialModificationSchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(20),
  description: z.string().max(255).nullable().optional(),
  percent_to_apply: z.string().min(1, 'El porciento es obligatorio'),
});
export type CreateSpecialModificationInput = z.infer<typeof createSpecialModificationSchema>;

export const updateSpecialModificationSchema = z.object({
  description: z.string().max(255).nullable().optional(),
  percent_to_apply: z.string().min(1).optional(),
});
export type UpdateSpecialModificationInput = z.infer<typeof updateSpecialModificationSchema>;

// Regla de beneficiario por rango de cantidades
export const createBeneficiaryRuleSchema = z.object({
  min_quantity: z.number().int().min(0, 'La cantidad mínima debe ser ≥ 0'),
  max_quantity: z.number().int().nullable().optional(),
  percent_to_apply: z.string().min(1, 'El porciento es obligatorio'),
}).superRefine((data, ctx) => {
  if (data.max_quantity != null && data.max_quantity < data.min_quantity) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['max_quantity'],
      message: 'La cantidad máxima debe ser mayor o igual a la mínima',
    });
  }
});
export type CreateBeneficiaryRuleInput = z.infer<typeof createBeneficiaryRuleSchema>;

export const updateBeneficiaryRuleSchema = z.object({
  min_quantity: z.number().int().min(0).optional(),
  max_quantity: z.number().int().nullable().optional(),
  percent_to_apply: z.string().min(1).optional(),
});
export type UpdateBeneficiaryRuleInput = z.infer<typeof updateBeneficiaryRuleSchema>;
