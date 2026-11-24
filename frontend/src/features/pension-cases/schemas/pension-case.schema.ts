import { z } from 'zod';
import type { components } from '@/types/api';

export type PensionCase = components['schemas']['PensionCase'];
export type SalaryRecord = components['schemas']['SalaryRecord'];
export type ServiceRecord = components['schemas']['ServiceRecord'];
export type WorkCycle = components['schemas']['WorkCycle'];
export type IncomeConceptRecord = components['schemas']['IncomeConceptRecord'];
export type EntitledRelative = components['schemas']['EntitledRelative'];

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
  // Task 52/S8.8: declaración de imputabilidad de salarios ausentes (null válido sin déficit)
  missing_salaries_attributable: z.boolean().optional().nullable(),
  // Task 73/B-2: meses de salarios imputables — divisor EXPLÍCITO del SPM.
  // Solo declarable cuando missing_salaries_attributable = false; 1..180 (techo de 15 años en meses).
  // null ⇒ divisor = N_eff × 12 (semántica histórica). La validación cruzada la hace el backend (422).
  imputable_salary_months: z.number().int().min(1).max(180).optional().nullable(),
  // Task 74/Bloque C: bloque de invalidez del expediente. Los 5 campos son obligatorios
  // cuando el pension_type.retirement_type === 'invalidez' y prohibidos en el resto.
  // El frontend NO valida esa coherencia — la hace el backend. Solo captura y transmite.
  disease_id: z.number().int().positive().optional().nullable(),
  disease_origin: z.enum(['comun', 'profesional', 'accidente_trabajo', 'accidente_trayecto']).optional().nullable(),
  re_assessment_date: z.string().optional().nullable(),
  requires_personal_care: z.boolean().optional().nullable(),
  temporary_disability: z.boolean().optional().nullable(),
  // Bloque de defunción: obligatorio con fallecimiento, prohibido en el resto.
  death_date: z.string().optional().nullable(),
  death_certificate: z.string().optional().nullable(),
  death_certificate_date: z.string().optional().nullable(),
  forced_age_retirement: z.boolean().optional().nullable(),
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
  // Task 52/S8.8: PATCH (null explícito limpia; la omisión no toca el valor almacenado)
  missing_salaries_attributable: z.boolean().optional().nullable(),
  // Task 73/B-2: PATCH — null explícito limpia el divisor; la omisión no toca el valor almacenado.
  // Solo se acepta cuando missing_salaries_attributable = false (422 en el resto, D-7307(a)).
  imputable_salary_months: z.number().int().min(1).max(180).optional().nullable(),
  // Task 74/Bloque C: PATCH del bloque de invalidez. La omisión no toca el valor almacenado;
  // null explícito lo limpia. La coherencia con retirement_type === 'invalidez' la valida el
  // backend contra el estado RESULTANTE del expediente (D-7407, D-7408).
  disease_id: z.number().int().positive().optional().nullable(),
  disease_origin: z.enum(['comun', 'profesional', 'accidente_trabajo', 'accidente_trayecto']).optional().nullable(),
  re_assessment_date: z.string().optional().nullable(),
  requires_personal_care: z.boolean().optional().nullable(),
  temporary_disability: z.boolean().optional().nullable(),
  death_date: z.string().optional().nullable(),
  death_certificate: z.string().optional().nullable(),
  death_certificate_date: z.string().optional().nullable(),
  forced_age_retirement: z.boolean().optional().nullable(),
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

// Familiar con derecho (subresource POST /pension-cases/{id}/entitled-relatives)
export const entitledRelativeSchema = z.object({
  beneficiary_person_id: z.number().int().positive('La persona beneficiaria es obligatoria'),
  beneficiary_type_id: z.number().int().positive('El tipo de beneficiario es obligatorio'),
  agency_type_id: z.number().int().positive('El tipo de agencia de cobro es obligatorio'),
  agency_id: z.number().int().positive('La agencia de cobro es obligatoria'),
  bank_account: z.string().max(34).optional().nullable(),
  tutor_person_id: z.number().int().positive().optional().nullable(),
});
export type EntitledRelativeInput = z.infer<typeof entitledRelativeSchema>;

// Metadata de estados del expediente
export const CASE_STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  submitted: { label: 'Solicitud', badgeClass: 'badge-submitted' },
  under_review: { label: 'Revisión', badgeClass: 'badge-under_review' },
  approved: { label: 'Aprobado', badgeClass: 'badge-approved' },
  rejected: { label: 'Denegado', badgeClass: 'badge-rejected' },
};

// Estados del expediente (sección 2.4) — máquina declarativa
export type CaseStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

/**
 * Matriz de transiciones legales (sección 2.4):
 *   submitted     → under_review          (revisión, especialista, cases.review)
 *   under_review  → submitted             (devolución, especialista, cases.review)
 *   under_review  → approved              (aprobación, Director, cases.approve)
 *   under_review  → rejected              (denegación, Director, cases.reject)
 *   approved      → under_review          (reapertura, Administrador, cases.reopen)
 *   rejected      → under_review          (reapertura, Administrador, cases.reopen)
 *
 * Cada transición legal define su permiso, si exige nota (mínimo 10 caracteres),
 * si exige base legal vigente y si admite force (RF-LEG-003).
 */
export interface TransitionRule {
  to: CaseStatus;
  permission: 'cases.review' | 'cases.approve' | 'cases.reject' | 'cases.reopen';
  /** La nota es obligatoria y se valida ≥ 10 caracteres */
  noteRequired: boolean;
  /** Base legal vigente obligatoria (solo aprobación) */
  legalBasisRequired: boolean;
  /** Bandera force admitida (solo aprobación, base legal derogada) */
  forceAllowed: boolean;
  /** Etiqueta breve de la transición para UI */
  labelKey: string;
}

export const TRANSITION_MATRIX: Record<CaseStatus, TransitionRule[]> = {
  submitted: [
    { to: 'under_review', permission: 'cases.review', noteRequired: false, legalBasisRequired: false, forceAllowed: false, labelKey: 'transition.to.under_review' },
  ],
  under_review: [
    { to: 'submitted', permission: 'cases.review', noteRequired: false, legalBasisRequired: false, forceAllowed: false, labelKey: 'transition.to.submitted' },
    { to: 'approved', permission: 'cases.approve', noteRequired: true, legalBasisRequired: true, forceAllowed: true, labelKey: 'transition.to.approved' },
    { to: 'rejected', permission: 'cases.reject', noteRequired: true, legalBasisRequired: false, forceAllowed: false, labelKey: 'transition.to.rejected' },
  ],
  approved: [
    { to: 'under_review', permission: 'cases.reopen', noteRequired: true, legalBasisRequired: false, forceAllowed: false, labelKey: 'transition.to.under_review' },
  ],
  rejected: [
    { to: 'under_review', permission: 'cases.reopen', noteRequired: true, legalBasisRequired: false, forceAllowed: false, labelKey: 'transition.to.under_review' },
  ],
};

/**
 * Schema para POST /pension-cases/{id}/transitions.
 * El campo `to` es obligatorio; note/legal_basis_id/force son condicionales según la matriz.
 */
export const transitionSchema = z.object({
  to: z.enum(['submitted', 'under_review', 'approved', 'rejected']),
  note: z.string().max(2000).optional().nullable(),
  legal_basis_id: z.number().int().positive().optional().nullable(),
  force: z.boolean().optional().nullable(),
}).superRefine((data, ctx) => {
  // La validación de "nota ≥ 10 caracteres" se hace en el backend (422 con detalle),
  // pero hacemos una pre-validación de UX para evitar viajes innecesarios.
  if (data.note != null && data.note.length > 0 && data.note.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['note'],
      message: 'La nota debe tener al menos 10 caracteres',
    });
  }
});
export type TransitionInput = z.infer<typeof transitionSchema>;
