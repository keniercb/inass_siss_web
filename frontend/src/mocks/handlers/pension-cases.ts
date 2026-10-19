import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type PensionCase = components['schemas']['PensionCase'];
type SalaryRecord = components['schemas']['SalaryRecord'];
type ServiceRecord = components['schemas']['ServiceRecord'];
type WorkCycle = components['schemas']['WorkCycle'];
type IncomeConceptRecord = components['schemas']['IncomeConceptRecord'];
type CalculationPreview = components['schemas']['CalculationPreview'];
type CaseCalculation = components['schemas']['CaseCalculation'];

const API_BASE = 'http://localhost:8000/api/v1';

/**
 * Calcula worked_months y worked_years para un ServiceRecord (Task 48 / SGP-38):
 *  - worked_months = (AÑO(end) - AÑO(start)) × 12 + (MES(end) - MES(start))
 *    (el día NO cuenta; 2000-01-01 → 2005-12-31 = 71)
 *  - worked_years  = round(worked_months / months_per_year)  (mitad hacia arriba)
 *
 * El backend los congela al alta y jamás los acepta en el wire (422). El mock
 * los calcula en el POST para simular ese comportamiento.
 */
function computeWorkedTime(startIso: string, endIso: string, monthsPerYear = 12): { worked_months: number; worked_years: number } {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { worked_months: 0, worked_years: 0 };
  }
  const worked_months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const worked_years = Math.round(worked_months / monthsPerYear);
  return { worked_months, worked_years };
}

// Datos mock base — alineados con docs.json (rebel_army_member + rebel_army_join_date +
// pension_type_id + pension_regime_id + income_concept_records: [])
const baseCase = (overrides: Partial<PensionCase>): PensionCase => ({
  rebel_army_member: false,
  rebel_army_join_date: null,
  pension_type_id: 1,
  pension_regime_id: 1,
  income_concept_records: [],
  ...overrides,
} as PensionCase);

const cases = new Map<number, PensionCase>([
  [1, baseCase({ id: 1, number: '11-2026-00001', requested_at: '2026-09-15', status: 'submitted', applicant_person_id: 2, office_id: 1, employer_entity_id: 1, position_id: 1, occupational_category_id: 1, educational_level_id: 5, scientific_category_id: 1, last_salary: '5200.00', approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null, computed_amount: null, salary_records: [], service_records: [], work_cycles: [], applicant: { id: 2, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' } as never })],
  [2, baseCase({ id: 2, number: '11-2026-00002', requested_at: '2026-09-14', status: 'under_review', applicant_person_id: 1, office_id: 2, employer_entity_id: 2, position_id: 2, occupational_category_id: 2, educational_level_id: 3, scientific_category_id: 2, last_salary: '4800.00', approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null, computed_amount: null, salary_records: [{ id: 1, pension_case_id: 2, year: 2023, earned_salary: '4500.00' } as SalaryRecord, { id: 2, pension_case_id: 2, year: 2024, earned_salary: '4800.00' } as SalaryRecord], service_records: [{ id: 1, pension_case_id: 2, entity_id: 1, entity: { id: 1, code: 'EMP001', name: 'Empresa Nacional de Servicios Técnicos', tax_id_number: 'NIT-001-123456' } as never, start_date: '2010-01-01', end_date: '2024-12-31', is_appendix: false, declaration_form: 'Documental', worked_months: 179, worked_years: 15 } as ServiceRecord], work_cycles: [{ id: 1, pension_case_id: 2, planned_days: 365, actual_days: 350, cycles_count: 1 } as WorkCycle], income_concept_records: [{ id: 1, pension_case_id: 2, income_concept_id: 3, amount: '150.00', applied_percent: '100.00' } as IncomeConceptRecord], applicant: { id: 1, identity_number: '85061547812', first_name: 'Ana', first_surname: 'Pérez' } as never })],
  [3, baseCase({ id: 3, number: '11-2026-00003', requested_at: '2026-09-10', status: 'approved', applicant_person_id: 3, office_id: 1, employer_entity_id: 1, position_id: 1, occupational_category_id: 1, educational_level_id: 5, scientific_category_id: 1, last_salary: '6500.00', approval_legal_basis_id: 1, decision_notes: 'Aprobado conforme ley 105', decided_at: '2026-09-20T10:00:00Z', decided_by: 2, computed_amount: '3250.00', salary_records: [{ id: 3, pension_case_id: 3, year: 2024, earned_salary: '6500.00' } as SalaryRecord], service_records: [{ id: 2, pension_case_id: 3, entity_id: 1, entity: { id: 1, code: 'EMP001', name: 'Empresa Nacional de Servicios Técnicos', tax_id_number: 'NIT-001-123456' } as never, start_date: '2005-01-01', end_date: '2024-12-31', is_appendix: false, declaration_form: 'Documental', worked_months: 239, worked_years: 20 } as ServiceRecord], work_cycles: [], applicant: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } as never })],
  [4, baseCase({ id: 4, number: '11-2026-00004', requested_at: '2026-09-08', status: 'rejected', applicant_person_id: 5, office_id: 3, employer_entity_id: 3, position_id: 3, occupational_category_id: 3, educational_level_id: 2, scientific_category_id: 3, last_salary: '3200.00', approval_legal_basis_id: null, decision_notes: 'No cumple años mínimos de trabajo', decided_at: '2026-09-15T14:00:00Z', decided_by: 2, computed_amount: null, salary_records: [], service_records: [], work_cycles: [], applicant: { id: 5, identity_number: '72051548124', first_name: 'Roberto', first_surname: 'Hernández' } as never })],
]);

let nextCaseId = 100;
let nextSalaryId = 100;
let nextServiceId = 100;
let nextCycleId = 100;
let nextIncomeId = 100;
let nextTransitionId = 100;

// Historial append-only de transiciones por expediente (caso_id → filas)
// S6, RF-EXP-009. Se siembra con una transición inicial para los casos aprobados/denegados.
const caseHistory = new Map<number, components['schemas']['PensionCaseHistory'][]>([
  [3, [
    { id: 1, from_status: 'submitted', to_status: 'under_review', changed_by: { id: 2, name: 'Especialista' }, changed_at: '2026-09-18T09:15:00+00:00', note: 'Solicitud completa, entra a revisión.' },
    { id: 2, from_status: 'under_review', to_status: 'approved', changed_by: { id: 2, name: 'Director' }, changed_at: '2026-09-20T10:00:00+00:00', note: 'Aprobado conforme ley 105.' },
  ]],
  [4, [
    { id: 3, from_status: 'submitted', to_status: 'under_review', changed_by: { id: 2, name: 'Especialista' }, changed_at: '2026-09-12T08:30:00+00:00', note: 'En revisión.' },
    { id: 4, from_status: 'under_review', to_status: 'rejected', changed_by: { id: 2, name: 'Director' }, changed_at: '2026-09-15T14:00:00+00:00', note: 'No cumple años mínimos de trabajo.' },
  ]],
]);

// Matriz legal de transiciones (sección 2.4) — refleja la del backend.
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review'],
  under_review: ['submitted', 'approved', 'rejected'],
  approved: ['under_review'],
  rejected: ['under_review'],
};

// Permisos por transición (cubre el rol del actor) — referencia documental
// (no se valida en el mock porque el backend ya cubre 403 contra el actor real)
// const TRANSITION_PERMISSION: Record<string, string> = {
//   submitted_to_under_review: 'cases.review',
//   under_review_to_submitted: 'cases.review',
//   under_review_to_approved: 'cases.approve',
//   under_review_to_rejected: 'cases.reject',
//   approved_to_under_review: 'cases.reopen',
//   rejected_to_under_review: 'cases.reopen',
// };

export const pensionCasesHandlers = [
  // GET /pension-cases — listado
  http.get(`${API_BASE}/pension-cases`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const sort = url.searchParams.get('sort') ?? 'requested_at';
    const order = url.searchParams.get('order') ?? 'desc';

    let items = Array.from(cases.values());
    if (status) items = items.filter((c) => c.status === status);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((c) => c.number?.toLowerCase().includes(q) || `${c.applicant?.first_name ?? ''} ${c.applicant?.first_surname ?? ''}`.toLowerCase().includes(q));
    }
    items.sort((a, b) => {
      const av = String(a[sort as keyof PensionCase] ?? '');
      const bv = String(b[sort as keyof PensionCase] ?? '');
      return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);
    return HttpResponse.json({ data: paged, meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } });
  }),

  // POST /pension-cases — crear
  // NOTA: office_id está PROHIBIDO en la creación (regla 0/ADR-33);
  // el backend lo toma del usuario autenticado. No validar office_id aquí.
  http.post(`${API_BASE}/pension-cases`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const errors: Record<string, string[]> = {};
    if (!body.applicant_person_id) errors.applicant_person_id = ['El promovente es obligatorio.'];
    if (!body.employer_entity_id) errors.employer_entity_id = ['El centro de trabajo es obligatorio.'];
    if (!body.position_id) errors.position_id = ['El cargo es obligatorio.'];
    if (!body.occupational_category_id) errors.occupational_category_id = ['La categoría ocupacional es obligatoria.'];
    if (!body.educational_level_id) errors.educational_level_id = ['El nivel educacional es obligatorio.'];
    if (!body.scientific_category_id) errors.scientific_category_id = ['La categoría científica es obligatoria.'];
    if (!body.pension_type_id) errors.pension_type_id = ['El tipo de pensión es obligatorio.'];
    if (!body.pension_regime_id) errors.pension_regime_id = ['El régimen de pensión es obligatorio.'];
    if (body.last_salary === undefined || body.last_salary === null || body.last_salary === '') errors.last_salary = ['El último salario es obligatorio.'];
    // rebel_army_member + rebel_army_join_date conditional
    if (body.rebel_army_member === true && !body.rebel_army_join_date) errors.rebel_army_join_date = ['La fecha de incorporación al Ejército Rebelde es obligatoria cuando pertenece al mismo.'];
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Error de validación.', errors }, { status: 422 });

    const id = nextCaseId++;
    const newCase: PensionCase = baseCase({
      id,
      number: `${11}-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`,
      requested_at: (body.requested_at as string) || new Date().toISOString().split('T')[0],
      status: 'submitted',
      applicant_person_id: body.applicant_person_id as number,
      office_id: 1, // simulado: oficina del usuario autenticado
      employer_entity_id: body.employer_entity_id as number,
      position_id: body.position_id as number,
      occupational_category_id: body.occupational_category_id as number,
      educational_level_id: body.educational_level_id as number,
      scientific_category_id: body.scientific_category_id as number,
      pension_type_id: body.pension_type_id as number,
      pension_regime_id: body.pension_regime_id as number,
      last_salary: String(body.last_salary ?? '0'),
      rebel_army_member: body.rebel_army_member === true,
      rebel_army_join_date: body.rebel_army_member === true ? (body.rebel_army_join_date as string | null) : null,
      filed_by_person_id: ((body.filed_by_person_id as number | null | undefined) ?? null) as never,
      approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null,
      computed_amount: null,
      salary_records: [], service_records: [], work_cycles: [], income_concept_records: [],
      applicant: { id: body.applicant_person_id as number, identity_number: '—', first_name: '—', first_surname: '—' } as never,
    });
    cases.set(id, newCase);
    return HttpResponse.json({ data: newCase }, { status: 201 });
  }),

  // GET /pension-cases/{id} — detalle
  http.get(`${API_BASE}/pension-cases/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const c = cases.get(id);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: c });
  }),

  // PUT /pension-cases/{id} — editar (campos editables; promovente y persona por inmutables)
  http.put(`${API_BASE}/pension-cases/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const c = cases.get(id);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    if (c.status !== 'submitted') return HttpResponse.json({ message: 'Case not in submitted state.', status: c.status }, { status: 409 });
    const body = (await request.json()) as Record<string, unknown>;
    // Rechazar campos PROHIBIDOS
    const prohibited = ['applicant_person_id', 'filed_by_person_id', 'rebel_army_member', 'rebel_army_join_date', 'internationalist', 'phone', 'popular_council', 'termination_date', 'office_id', 'number', 'status'];
    const errors: Record<string, string[]> = {};
    prohibited.forEach((field) => {
      if (body[field] !== undefined) errors[field] = [`El campo ${field} está prohibido.`];
    });
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Error de validación.', errors }, { status: 422 });
    const updated: PensionCase = {
      ...c,
      employer_entity_id: (body.employer_entity_id as number) ?? c.employer_entity_id,
      position_id: (body.position_id as number) ?? c.position_id,
      occupational_category_id: (body.occupational_category_id as number) ?? c.occupational_category_id,
      educational_level_id: (body.educational_level_id as number) ?? c.educational_level_id,
      scientific_category_id: (body.scientific_category_id as number) ?? c.scientific_category_id,
      pension_type_id: (body.pension_type_id as number) ?? c.pension_type_id,
      pension_regime_id: (body.pension_regime_id as number) ?? c.pension_regime_id,
      last_salary: body.last_salary != null ? String(body.last_salary) : c.last_salary,
      requested_at: (body.requested_at as string) ?? c.requested_at,
    };
    cases.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // DELETE /pension-cases/{id} — eliminación lógica (solo si status=submitted)
  http.delete(`${API_BASE}/pension-cases/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const c = cases.get(id);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    if (c.status !== 'submitted') return HttpResponse.json({ message: 'Case not in submitted state.', status: c.status }, { status: 409 });
    cases.delete(id);
    return HttpResponse.json({ message: 'Case deleted.' });
  }),

  // POST /pension-cases/{id}/salary-records
  http.post(`${API_BASE}/pension-cases/:id/salary-records`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextSalaryId++;
    const record = { id, pension_case_id: caseId, year: body.year, earned_salary: String(body.earned_salary) } as unknown as SalaryRecord;
    c.salary_records = [...(c.salary_records ?? []), record];
    cases.set(caseId, c);
    return HttpResponse.json({ data: record }, { status: 201 });
  }),

  // DELETE /pension-cases/{id}/salary-records/{record}
  http.delete(`${API_BASE}/pension-cases/:id/salary-records/:record`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const recordId = parseInt(params.record as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    c.salary_records = (c.salary_records ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Eliminado.' });
  }),

  // POST /pension-cases/{id}/service-records
  http.post(`${API_BASE}/pension-cases/:id/service-records`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextServiceId++;
    // Task 48 / SGP-38: worked_months y worked_years son DERIVADOS —
    // el backend los calcula al alta y jamás los acepta en el wire (422).
    const startDate = body.start_date as string;
    const endDate = (body.end_date as string | null) ?? null;
    const { worked_months, worked_years } = endDate
      ? computeWorkedTime(startDate, endDate)
      : { worked_months: 0, worked_years: 0 };
    const record = { id, pension_case_id: caseId, entity_id: body.entity_id, entity: { id: body.entity_id as number, code: 'EMP-NEW', name: 'Entidad #' + String(body.entity_id), tax_id_number: 'NIT-NEW' } as never, start_date: startDate, end_date: endDate, is_appendix: (body.is_appendix as boolean | undefined) ?? false, declaration_form: (body.declaration_form as 'Documental' | 'Testifical' | undefined) ?? 'Documental', worked_months, worked_years } as unknown as ServiceRecord;
    c.service_records = [...(c.service_records ?? []), record];
    cases.set(caseId, c);
    return HttpResponse.json({ data: record }, { status: 201 });
  }),

  // DELETE /pension-cases/{id}/service-records/{record}
  http.delete(`${API_BASE}/pension-cases/:id/service-records/:record`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const recordId = parseInt(params.record as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    c.service_records = (c.service_records ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Eliminado.' });
  }),

  // POST /pension-cases/{id}/work-cycles
  http.post(`${API_BASE}/pension-cases/:id/work-cycles`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextCycleId++;
    const record = { id, pension_case_id: caseId, planned_days: body.planned_days, actual_days: body.actual_days, cycles_count: body.cycles_count } as WorkCycle;
    c.work_cycles = [...(c.work_cycles ?? []), record];
    cases.set(caseId, c);
    return HttpResponse.json({ data: record }, { status: 201 });
  }),

  // DELETE /pension-cases/{id}/work-cycles/{record}
  http.delete(`${API_BASE}/pension-cases/:id/work-cycles/:record`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const recordId = parseInt(params.record as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    c.work_cycles = (c.work_cycles ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Eliminado.' });
  }),

  // POST /pension-cases/{id}/income-concept-records
  http.post(`${API_BASE}/pension-cases/:id/income-concept-records`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const errors: Record<string, string[]> = {};
    if (!body.income_concept_id) errors.income_concept_id = ['El concepto de ingreso es obligatorio.'];
    if (body.applied_percent === undefined || body.applied_percent === null || body.applied_percent === '') errors.applied_percent = ['El porciento aplicado es obligatorio.'];
    // Task 54/SGP-39: amount NO se acepta en el wire (422 si llega, D-14 b/D-15 a)
    if (body.amount !== undefined && body.amount !== null) {
      errors.amount = ['El campo importe no se acepta: el motor v2 lo deriva del porciento aplicado.'];
    }
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Error de validación.', errors }, { status: 422 });
    const id = nextIncomeId++;
    // El amount lo deriva el motor v2 — aquí simulamos con un valor fijo para que la proyección tenga dato
    const derivedAmount = String((Number(body.applied_percent) / 100) * 1000);
    const record = { id, pension_case_id: caseId, income_concept_id: body.income_concept_id, applied_percent: String(body.applied_percent), amount: derivedAmount } as unknown as IncomeConceptRecord;
    c.income_concept_records = [...(c.income_concept_records ?? []), record];
    cases.set(caseId, c);
    return HttpResponse.json({ data: record }, { status: 201 });
  }),

  // DELETE /pension-cases/{id}/income-concept-records/{record}
  http.delete(`${API_BASE}/pension-cases/:id/income-concept-records/:record`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const recordId = parseInt(params.record as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    c.income_concept_records = (c.income_concept_records ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Eliminado.' });
  }),

  // GET /pension-cases/{id}/transitions — historial append-only (S6, RF-EXP-009)
  http.get(`${API_BASE}/pension-cases/:id/transitions`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const rows = caseHistory.get(caseId) ?? [];
    // Orden cronológico (más antigua primero), ya están sembradas así
    return HttpResponse.json({ data: rows });
  }),

  // POST /pension-cases/{id}/transitions — Máquina declarativa (S6, RF-EXP-005..010, ADR-07)
  http.post(`${API_BASE}/pension-cases/:id/transitions`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    const body = (await request.json()) as {
      to?: string;
      note?: string | null;
      legal_basis_id?: number | null;
      force?: boolean | null;
    };

    // 1. Validación del cuerpo
    if (!body.to || !['submitted', 'under_review', 'approved', 'rejected'].includes(body.to)) {
      return HttpResponse.json({ message: 'Error de validación.', errors: { to: ['El campo to es obligatorio y debe ser un estado válido.'] } }, { status: 422 });
    }

    const fromStatus = c.status ?? 'submitted';
    const toStatus = body.to;

    // 2. ¿Es transición legal según la matriz?
    const legal = LEGAL_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
    if (!legal) {
      return HttpResponse.json({
        message: 'Transición no permitida por la matriz (sección 2.4).',
        status: fromStatus,
        attempted_to: toStatus,
        case_id: caseId,
      }, { status: 422 });
    }

    // 3. Validaciones de evidencia según la transición
    const note = body.note ?? null;
    const errors: Record<string, string[]> = {};
    const missing: string[] = [];

    // Nota obligatoria en aprobación, denegación y reapertura (mínimo 10 caracteres)
    const noteRequired = ['approved', 'rejected'].includes(toStatus) || ['approved', 'rejected'].includes(fromStatus);
    if (noteRequired) {
      if (!note || note.length < 10) {
        errors.note = ['La nota es obligatoria y debe tener al menos 10 caracteres.'];
      }
    }

    // Base legal obligatoria en aprobación
    if (toStatus === 'approved') {
      if (!body.legal_basis_id) {
        errors.legal_basis_id = ['La base legal es obligatoria para la aprobación.'];
      }
      // Simulamos: legal_basis_id 1 = vigente, 2 = derogada, 3 = futura
      if (body.legal_basis_id === 3) {
        errors.legal_basis_id = ['No se puede usar una base legal futura.'];
      }
      if (body.legal_basis_id === 2 && !body.force) {
        errors.legal_basis_id = ['La base legal está derogada. Solo un Administrador puede forzarla.'];
      }
    } else {
      // Base legal prohibida en otras transiciones
      if (body.legal_basis_id) {
        errors.legal_basis_id = ['La base legal está prohibida en esta transición.'];
      }
      if (body.force) {
        errors.force = ['El indicador de forzado está prohibido en esta transición.'];
      }
    }

    // 4. Completitud al entrar en revisión (RF-EXP-006)
    if (toStatus === 'under_review' && fromStatus === 'submitted') {
      if (!c.salary_records || c.salary_records.length === 0) missing.push('salary_records');
      if (!c.service_records || c.service_records.length === 0) missing.push('service_records');
      if (c.last_salary == null || Number(c.last_salary) <= 0) missing.push('last_salary');
    }

    if (Object.keys(errors).length > 0 || missing.length > 0) {
      const payload: Record<string, unknown> = {
        message: 'No se cumplen los requisitos de la transición.',
        status: fromStatus,
        attempted_to: toStatus,
        case_id: caseId,
      };
      if (Object.keys(errors).length > 0) payload.errors = errors;
      if (missing.length > 0) payload.missing = missing;
      return HttpResponse.json(payload, { status: 422 });
    }

    // 5. Aplicar transición: actualiza el expediente y persiste la fila en el historial
    const previousStatus = c.status;
    const updated: PensionCase = {
      ...c,
      status: toStatus as PensionCase['status'],
      // La reapertura limpia la evidencia de decisión (decision fields vuelven a null)
      ...(toStatus === 'under_review' ? {
        approval_legal_basis_id: null,
        decision_notes: null,
        decided_at: null,
        decided_by: null,
        computed_amount: null,
      } : {}),
      // La aprobación congela la evidencia
      ...(toStatus === 'approved' ? {
        approval_legal_basis_id: body.legal_basis_id ?? null,
        decision_notes: note,
        decided_at: new Date().toISOString(),
        decided_by: 2, // mock: el usuario autenticado (Director)
        computed_amount: c.last_salary ? String(Number(c.last_salary) * 0.5) : null,
      } : {}),
      // La denegación persiste la nota como decision_notes
      ...(toStatus === 'rejected' ? {
        decision_notes: note,
        decided_at: new Date().toISOString(),
        decided_by: 2,
      } : {}),
    };
    cases.set(caseId, updated);

    const transitionRow: components['schemas']['PensionCaseHistory'] = {
      id: nextTransitionId++,
      from_status: previousStatus as components['schemas']['PensionCaseHistory']['from_status'],
      to_status: toStatus as components['schemas']['PensionCaseHistory']['to_status'],
      changed_by: { id: 2, name: 'Usuario actual' },
      changed_at: new Date().toISOString(),
      note,
    };
    const rows = caseHistory.get(caseId) ?? [];
    caseHistory.set(caseId, [...rows, transitionRow]);

    return HttpResponse.json({ data: updated, transition: transitionRow });
  }),

  // GET /pension-cases/{id}/calculation — snapshot congelado (Task 51/S8.4, RF-CAL-008)
  // Devuelve null mientras no haya snapshot (no aprobado).
  http.get(`${API_BASE}/pension-cases/:id/calculation`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    // Snapshot solo existe si el caso fue aprobado alguna vez
    if (c.status !== 'approved') {
      return HttpResponse.json({ data: null });
    }
    // Snapshot simulado: cuantía vigente, regime_parameters con los valores del catálogo General
    // (api.ts codegen tipa eligibility/regime_parameters/inputs como Record<string, never>
    //  porque el OpenAPI solo dice type:object; usamos as never para asignar objetos estructurados)
    const snapshot = {
      pension_case_id: caseId,
      sequence: 1,
      computed_at: c.decided_at ?? new Date().toISOString(),
      computed_by: { id: c.decided_by ?? 2, name: 'Director' },
      service_months: (c.service_records ?? []).reduce((acc, r) => acc + (r.worked_months ?? 0), 0),
      service_years_exact: ((c.service_records ?? []).reduce((acc, r) => acc + (r.worked_months ?? 0), 0)) / 12,
      service_years_truncated: Math.floor(((c.service_records ?? []).reduce((acc, r) => acc + (r.worked_months ?? 0), 0)) / 12),
      average_strategy: 'best_n' as const,
      average_years_count: 5,
      // Task 52/S8.8 V-8: N efectivo congelado = N (backfill = gate exacto histórico)
      // Ojo: el schema CaseCalculation usa 'average_years_effective', no 'average_years_used'
      average_years_effective: 5,
      // Task 52/S8.8 V-8: declaración congelada con la resolución (null sin déficit)
      missing_salaries_attributable: null as boolean | null,
      average_monthly_salary: c.last_salary ?? '0.00',
      excess_years: Math.max(0, Math.floor(((c.service_records ?? []).reduce((acc, r) => acc + (r.worked_months ?? 0), 0)) / 12) - 25),
      amount: c.computed_amount ?? '0.00',
      eligibility: { eligible: true, criteria: [{ criterion: 'age', passes: true, explanation: 'Cumple la edad mínima requerida.' }, { criterion: 'work_years', passes: true, explanation: 'Cumple los años mínimos requeridos.' }] },
      regime_parameters: {
        months_per_year: 12,
        base_calc_percent: '0.5',
        annual_increase_percent: '0.01',
        limit_percent: '0.9',
        min_work_years: 25,
        min_age_men: 60,
        min_age_women: 55,
        required_salary_records: 5,
        average_years_count: 5,
        average_strategy: 'best_n',
      },
      inputs: {
        last_salary: c.last_salary ?? '0.00',
        requested_at: c.requested_at ?? '—',
        birth_date: '1960-02-03',
        sex: 'M',
        missing_salaries_attributable: null as boolean | null,
        salaries: (c.salary_records ?? []).map((r) => ({ id: r.id, year: r.year, earned_salary: r.earned_salary })),
        // Task 53/S8.9: lista income_concepts[] congelada con el porciento (sin amount desde Task 54)
        income_concepts: (c.income_concept_records ?? []).map((icr) => ({
          income_concept_id: icr.income_concept_id,
          code: 'SALB',
          applied_percent: icr.applied_percent,
        })),
      },
      versions: [
        {
          sequence: 1,
          amount: c.computed_amount ?? '0.00',
          computed_at: c.decided_at ?? new Date().toISOString(),
          computed_by: { id: c.decided_by ?? 2, name: 'Director' },
        },
      ],
    } as unknown as CaseCalculation;
    return HttpResponse.json({ data: snapshot });
  }),

  // POST /pension-cases/{id}/calculation-preview — vista previa SIN persistir (Task 51/S8.2, RF-CAL-006)
  http.post(`${API_BASE}/pension-cases/:id/calculation-preview`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });

    // Solo disponible en submitted/under_review
    if (c.status !== 'submitted' && c.status !== 'under_review') {
      return HttpResponse.json({
        message: 'La vista previa solo está disponible para expedientes en Solicitud o Revisión.',
      }, { status: 409 });
    }

    // Simula el motor: si no hay salarioRecords o servicios, warnings
    const salaryCount = (c.salary_records ?? []).length;
    const serviceMonths = (c.service_records ?? []).reduce((acc, r) => acc + (r.worked_months ?? 0), 0);
    const warnings: string[] = [];

    // Warnings: serie salarial incompleta respecto al umbral del régimen (5)
    if (salaryCount < 5) {
      warnings.push(`Serie salarial incompleta: ${salaryCount}/5 registros requeridos por el umbral del régimen.`);
    }
    // AT truncado vs min_work_years (25)
    const atTruncated = Math.floor(serviceMonths / 12);
    if (atTruncated < 25) {
      warnings.push(`Años trabajados (${atTruncated}) por debajo del mínimo general del régimen (25).`);
    }
    // Sin service_records
    if (serviceMonths === 0) {
      warnings.push('Sin registros de servicio declarados.');
    }

    // Elegibilidad: edad y años (no podemos verificar edad sin fecha de nacimiento en este simulador)
    // Siempre elegible en este simulador básico
    const eligible = warnings.length === 0;

    // SPM = último salario (simulador simplificado; en el real es estrategia+divisor)
    const spm = c.last_salary ?? '0.00';
    // Cuantía v1 = SPM × 0.5 (PCI del General) + ATE × 0.01 × SPM, topeado por SPM × 0.9
    const ate = Math.max(0, atTruncated - 25);
    const base = Number(spm) * 0.5;
    const excess = ate * 0.01 * Number(spm);
    const amount = Math.min(base + excess, Number(spm) * 0.9);

    const preview = {
      status: c.status as 'submitted' | 'under_review',
      eligibility: {
        eligible,
        criteria: [
          { criterion: 'age', passes: true, explanation: 'No se puede verificar la edad sin fecha de nacimiento en este simulador.' },
          { criterion: 'work_years', passes: atTruncated >= 25, explanation: atTruncated >= 25 ? `Cumple ${atTruncated} años, mayor o igual que el mínimo de 25.` : `Solo ${atTruncated} años, menor que el mínimo de 25.` },
        ],
      },
      service_years: {
        months: serviceMonths,
        exact: serviceMonths / 12,
        truncated: atTruncated,
      },
      average_monthly_salary: spm,
      excess_years: ate,
      amount: amount.toFixed(2),
      regime_parameters: {
        months_per_year: 12,
        base_calc_percent: '0.5',
        annual_increase_percent: '0.01',
        limit_percent: '0.9',
        min_work_years: 25,
        min_age_men: 60,
        min_age_women: 55,
        required_salary_records: 5,
        average_years_count: 5,
        average_strategy: 'best_n',
      },
      // Task 52/S8.8 V-7: N efectivo divisor (R >= N ⇒ N; déficit no imputable ⇒ R; imputable ⇒ N con ausentes a salario cero)
      average_years_used: salaryCount >= 5 ? 5 : salaryCount,
      // Task 52/S8.8 V-6: declaración de imputabilidad (null sin déficit)
      missing_salaries_attributable: salaryCount < 5 ? (c.missing_salaries_attributable ?? null) : null,
      // Task 53/S8.9 V-11: conceptos APLICABLES (applies_base_salary) que el motor consumió como incrementos
      income_concept_terms: (c.income_concept_records ?? []).map((icr) => ({
        income_concept_id: icr.income_concept_id,
        code: 'SALB',
        name: 'Salario base',
        applied_percent: icr.applied_percent,
      })),
      // Task 53/S8.9: porciento total (Σ)
      income_concept_percent: (c.income_concept_records ?? []).reduce((acc, icr) => acc + Number(icr.applied_percent ?? 0), 0).toFixed(2),
      // Task 57-58/SGP-42-43: indicadores de la fórmula v3
      combat_percent: null,
      combat_before_threshold: null,
      internationalist_applied: false,
      minimum_increment_applied: false,
      capped_by_maximum: false,
      above_maximum: false,
      warnings,
    } as unknown as CalculationPreview;
    return HttpResponse.json({ data: preview });
  }),
];
