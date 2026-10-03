import { z } from 'zod';
import type { components } from '@/types/api';

export type PensionCase = components['schemas']['PensionCase'];
export type SalaryRecord = components['schemas']['SalaryRecord'];
export type ServiceRecord = components['schemas']['ServiceRecord'];
export type WorkCycle = components['schemas']['WorkCycle'];
export type IncomeConceptRecord = components['schemas']['IncomeConceptRecord'];

// Schema para crear expediente (number, requested_at y office_id los maneja el backend)
// Campos alineados con docs.json: rebel_army_member + rebel_army_join_date
export const createCaseSchema = z.object({
  applicant_person_id: z.number().int().positive('El proponente es obligatorio'),
  employer_entity_id: z.number().int().positive('El centro de trabajo es obligatorio'),
  position_id: z.number().int().positive('El cargo es obligatorio'),
  occupational_category_id: z.number().int().positive('La categoría ocupacional es obligatoria'),
  educational_level_id: z.number().int().positive('El nivel educacional es obligatorio'),
  scientific_category_id: z.number().int().positive('La categoría científica es obligatoria'),
  last_salary: z.number().min(0, 'El último salario debe ser ≥ 0'),
  pension_type_id: z.number().int().positive('El tipo de pensión es obligatorio'),
  pension_regime_id: z.number().int().positive('El régimen de pensión es obligatorio'),
  rebel_army_member: z.boolean().optional().default(false),
  rebel_army_join_date: z.string().optional().nullable(),
  internationalist: z.boolean(),
  filed_by_person_id: z.number().int().positive().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  popular_council: z.string().max(120).optional().nullable(),
  termination_date: z.string().optional().nullable(),
  current_address: z.string().min(1, 'La dirección actual es obligatoria'),
  residence_province_id: z.number().int().positive('La provincia de residencia es obligatoria'),
  residence_municipality_id: z.number().int().positive('El municipio de residencia es obligatorio'),
  collection_agency_type_id: z.number().int().positive('El tipo de agencia de cobro es obligatorio'),
  collection_agency_id: z.number().int().positive('La agencia de cobro es obligatoria'),
  bank_account: z.string().max(34).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.rebel_army_member === true && !data.rebel_army_join_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rebel_army_join_date'],
      message: 'La fecha de alta en el Ejército Rebelde es obligatoria si pertenece al mismo',
    });
  }
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;

// Schema para editar expediente (PUT /pension-cases/{id})
// Solo campos editables; applicant_person_id, rebel_army_*, internationalist,
// phone, popular_council, termination_date, filed_by_person_id son PROHIBIDOS (422)
export const updateCaseSchema = z.object({
  employer_entity_id: z.number().int().positive('El centro de trabajo es obligatorio'),
  position_id: z.number().int().positive('El cargo es obligatorio'),
  occupational_category_id: z.number().int().positive('La categoría ocupacional es obligatoria'),
  educational_level_id: z.number().int().positive('El nivel educacional es obligatorio'),
  scientific_category_id: z.number().int().positive('La categoría científica es obligatoria'),
  pension_type_id: z.number().int().positive('El tipo de pensión es obligatorio'),
  pension_regime_id: z.number().int().positive('El régimen de pensión es obligatorio'),
  last_salary: z.number().min(0, 'El último salario debe ser ≥ 0'),
  requested_at: z.string().optional().nullable(),
  current_address: z.string().optional(),
  residence_province_id: z.number().int().positive().optional(),
  residence_municipality_id: z.number().int().positive().optional(),
  collection_agency_type_id: z.number().int().positive().optional(),
  collection_agency_id: z.number().int().positive().optional(),
  bank_account: z.string().max(34).optional().nullable(),
});
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;

// Subregistros
export const salaryRecordSchema = z.object({
  year: z.number().int().min(1950, 'El año debe ser ≥ 1950').max(new Date().getFullYear() + 1),
  earned_salary: z.number().min(0, 'El salario debe ser ≥ 0'),
});
export type SalaryRecordInput = z.infer<typeof salaryRecordSchema>;

export const serviceRecordSchema = z.object({
  entity_id: z.number().int().positive('La entidad es obligatoria'),
  start_date: z.string().min(1, 'La fecha de inicio es obligatoria'),
  end_date: z.string().min(1, 'La fecha de fin es obligatoria'),
  is_appendix: z.boolean().optional().default(false),
  declaration_form: z.enum(['Documental', 'Testifical']).default('Documental'),
}).refine((data) => {
  if (data.end_date && data.start_date) {
    return new Date(data.end_date) > new Date(data.start_date);
  }
  return true;
}, { message: 'La fecha de fin debe ser estrictamente posterior a la fecha de inicio', path: ['end_date'] });
export type ServiceRecordInput = z.infer<typeof serviceRecordSchema>;

export const workCycleSchema = z.object({
  planned_days: z.number().int().min(0, 'Los días plan deben ser ≥ 0'),
  actual_days: z.number().int().min(0, 'Los días reales deben ser ≥ 0'),
  cycles_count: z.number().int().min(0, 'La cantidad de ciclos debe ser ≥ 0'),
});
export type WorkCycleInput = z.infer<typeof workCycleSchema>;

// Subregistro IncomeConceptRecord (regla de usuario 5)
export const incomeConceptRecordSchema = z.object({
  income_concept_id: z.number().int().positive('El concepto de ingreso es obligatorio'),
  applied_percent: z.number().min(0, 'El porciento debe ser ≥ 0').max(100, 'El porciento debe ser ≤ 100'),
});
export type IncomeConceptRecordInput = z.infer<typeof incomeConceptRecordSchema>;

// Metadata de estados del expediente
export const CASE_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  submitted: { label: 'Solicitud', badgeClass: 'badge-submitted' },
  under_review: { label: 'Revisión', badgeClass: 'badge-under_review' },
  approved: { label: 'Aprobado', badgeClass: 'badge-approved' },
  rejected: { label: 'Denegado', badgeClass: 'badge-rejected' },
};
