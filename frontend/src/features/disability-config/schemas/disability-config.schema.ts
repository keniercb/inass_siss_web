import { z } from 'zod';
import type { components } from '@/types/api';

export type DisabilityRule = components['schemas']['DisabilityRule'];
export type DisabilityIncrementBracket = components['schemas']['DisabilityIncrementBracket'];
export type SpecialDisabilityModification = components['schemas']['SpecialDisabilityModification'];
export type BeneficiaryRule = components['schemas']['BeneficiaryRule'];

// Los 5 orígenes de la regla de invalidez
export const DISABILITY_ORIGINS = ['comun', 'profesional', 'accidente_trabajo', 'accidente_trayecto', 'fallecimiento'] as const;
export type DisabilityOrigin = (typeof DISABILITY_ORIGINS)[number];

// === DisabilityRule ===
// El backend acepta base_percent e increment_percent como NUMBER (double) en el body,
// pero los devuelve como STRING en la response (precisión decimal). Los brackets NO van
// en el payload de la regla — se gestionan via endpoints separados /disability-increment-brackets.
export const createDisabilityRuleSchema = z.object({
  origin: z.enum(DISABILITY_ORIGINS),
  base_percent: z.number().min(0).max(100),
  increment_percent: z.number().min(0).max(100).optional().nullable(),
});
export type CreateDisabilityRuleInput = z.infer<typeof createDisabilityRuleSchema>;

export const updateDisabilityRuleSchema = z.object({
  base_percent: z.number().min(0).max(100).optional(),
  increment_percent: z.number().min(0).max(100).optional().nullable(),
});
export type UpdateDisabilityRuleInput = z.infer<typeof updateDisabilityRuleSchema>;

// === DisabilityIncrementBracket ===
// Se gestiona via /disability-increment-brackets (POST/PATCH/DELETE) con disability_rule_id.
export const createBracketSchema = z.object({
  disability_rule_id: z.number().int().positive(),
  min_years: z.number().int().min(0),
  max_years: z.number().int().nullable().optional(),
  annual_increment_percent: z.number().min(0).max(100).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.max_years != null && data.max_years < data.min_years) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_years'], message: 'El año máximo debe ser mayor o igual al mínimo' });
  }
});
export type CreateBracketInput = z.infer<typeof createBracketSchema>;

export const updateBracketSchema = z.object({
  min_years: z.number().int().min(0).optional(),
  max_years: z.number().int().nullable().optional(),
  annual_increment_percent: z.number().min(0).max(100).optional().nullable(),
});
export type UpdateBracketInput = z.infer<typeof updateBracketSchema>;

// === SpecialDisabilityModification ===
export const createSpecialModificationSchema = z.object({
  code: z.string().min(1).max(20),
  description: z.string().max(255).nullable().optional(),
  percent_to_apply: z.string().min(1),
});
export type CreateSpecialModificationInput = z.infer<typeof createSpecialModificationSchema>;

export const updateSpecialModificationSchema = z.object({
  description: z.string().max(255).nullable().optional(),
  percent_to_apply: z.string().min(1).optional(),
});
export type UpdateSpecialModificationInput = z.infer<typeof updateSpecialModificationSchema>;

// === BeneficiaryRule ===
export const createBeneficiaryRuleSchema = z.object({
  min_quantity: z.number().int().min(0),
  max_quantity: z.number().int().nullable().optional(),
  percent_to_apply: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.max_quantity != null && data.max_quantity < data.min_quantity) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['max_quantity'], message: 'La cantidad máxima debe ser mayor o igual a la mínima' });
  }
});
export type CreateBeneficiaryRuleInput = z.infer<typeof createBeneficiaryRuleSchema>;

export const updateBeneficiaryRuleSchema = z.object({
  min_quantity: z.number().int().min(0).optional(),
  max_quantity: z.number().int().nullable().optional(),
  percent_to_apply: z.string().min(1).optional(),
});
export type UpdateBeneficiaryRuleInput = z.infer<typeof updateBeneficiaryRuleSchema>;
