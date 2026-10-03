import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type PensionCase = components['schemas']['PensionCase'];
type SalaryRecord = components['schemas']['SalaryRecord'];
type ServiceRecord = components['schemas']['ServiceRecord'];
type WorkCycle = components['schemas']['WorkCycle'];
type IncomeConceptRecord = components['schemas']['IncomeConceptRecord'];

const API_BASE = 'http://localhost:8000/api/v1';

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
  [1, baseCase({ id: 1, number: '11-2026-00001', requested_at: '2026-09-15', status: 'submitted', applicant_person_id: 2, office_id: 1, employer_entity_id: 1, position_id: 1, occupational_category_id: 1, educational_level_id: 5, scientific_category_id: 1, last_salary: '5200.00', approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null, computed_amount: null, calculation_setting_id: null, salary_records: [], service_records: [], work_cycles: [], applicant: { id: 2, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' } as never })],
  [2, baseCase({ id: 2, number: '11-2026-00002', requested_at: '2026-09-14', status: 'under_review', applicant_person_id: 1, office_id: 2, employer_entity_id: 2, position_id: 2, occupational_category_id: 2, educational_level_id: 3, scientific_category_id: 2, last_salary: '4800.00', approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null, computed_amount: null, calculation_setting_id: null, salary_records: [{ id: 1, pension_case_id: 2, year: 2023, earned_salary: '4500.00' } as SalaryRecord, { id: 2, pension_case_id: 2, year: 2024, earned_salary: '4800.00' } as SalaryRecord], service_records: [{ id: 1, pension_case_id: 2, entity_id: 1, entity: { id: 1, code: 'EMP001', name: 'Empresa Nacional de Servicios Técnicos', tax_id_number: 'NIT-001-123456' } as never, start_date: '2010-01-01', end_date: '2024-12-31', is_appendix: false, declaration_form: 'Documental' } as ServiceRecord], work_cycles: [{ id: 1, pension_case_id: 2, planned_days: 365, actual_days: 350, cycles_count: 1 } as WorkCycle], income_concept_records: [{ id: 1, pension_case_id: 2, income_concept_id: 3, amount: '150.00' } as IncomeConceptRecord], applicant: { id: 1, identity_number: '85061547812', first_name: 'Ana', first_surname: 'Pérez' } as never })],
  [3, baseCase({ id: 3, number: '11-2026-00003', requested_at: '2026-09-10', status: 'approved', applicant_person_id: 3, office_id: 1, employer_entity_id: 1, position_id: 1, occupational_category_id: 1, educational_level_id: 5, scientific_category_id: 1, last_salary: '6500.00', approval_legal_basis_id: 1, decision_notes: 'Aprobado conforme ley 105', decided_at: '2026-09-20T10:00:00Z', decided_by: 2, computed_amount: '3250.00', calculation_setting_id: 2, salary_records: [{ id: 3, pension_case_id: 3, year: 2024, earned_salary: '6500.00' } as SalaryRecord], service_records: [{ id: 2, pension_case_id: 3, entity_id: 1, entity: { id: 1, code: 'EMP001', name: 'Empresa Nacional de Servicios Técnicos', tax_id_number: 'NIT-001-123456' } as never, start_date: '2005-01-01', end_date: '2024-12-31', is_appendix: false, declaration_form: 'Documental' } as ServiceRecord], work_cycles: [], applicant: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } as never })],
  [4, baseCase({ id: 4, number: '11-2026-00004', requested_at: '2026-09-08', status: 'rejected', applicant_person_id: 5, office_id: 3, employer_entity_id: 3, position_id: 3, occupational_category_id: 3, educational_level_id: 2, scientific_category_id: 3, last_salary: '3200.00', approval_legal_basis_id: null, decision_notes: 'No cumple años mínimos de trabajo', decided_at: '2026-09-15T14:00:00Z', decided_by: 2, computed_amount: null, calculation_setting_id: null, salary_records: [], service_records: [], work_cycles: [], applicant: { id: 5, identity_number: '72051548124', first_name: 'Roberto', first_surname: 'Hernández' } as never })],
]);

let nextCaseId = 100;
let nextSalaryId = 100;
let nextServiceId = 100;
let nextCycleId = 100;
let nextIncomeId = 100;

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
    if (!body.applicant_person_id) errors.applicant_person_id = ['The applicant is required.'];
    if (!body.employer_entity_id) errors.employer_entity_id = ['The employer entity is required.'];
    if (!body.position_id) errors.position_id = ['The position is required.'];
    if (!body.occupational_category_id) errors.occupational_category_id = ['The occupational category is required.'];
    if (!body.educational_level_id) errors.educational_level_id = ['The educational level is required.'];
    if (!body.scientific_category_id) errors.scientific_category_id = ['The scientific category is required.'];
    if (!body.pension_type_id) errors.pension_type_id = ['The pension type is required.'];
    if (!body.pension_regime_id) errors.pension_regime_id = ['The pension regime is required.'];
    if (body.last_salary === undefined || body.last_salary === null || body.last_salary === '') errors.last_salary = ['The last salary is required.'];
    // rebel_army_member + rebel_army_join_date conditional
    if (body.rebel_army_member === true && !body.rebel_army_join_date) errors.rebel_army_join_date = ['The Rebel Army join date is required when rebel_army_member is true.'];
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });

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
      computed_amount: null, calculation_setting_id: null,
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
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    return HttpResponse.json({ data: c });
  }),

  // PUT /pension-cases/{id} — editar (campos editables; promovente y persona por inmutables)
  http.put(`${API_BASE}/pension-cases/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const c = cases.get(id);
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    if (c.status !== 'submitted') return HttpResponse.json({ message: 'Case not in submitted state.', status: c.status }, { status: 409 });
    const body = (await request.json()) as Record<string, unknown>;
    // Rechazar campos PROHIBIDOS
    const prohibited = ['applicant_person_id', 'filed_by_person_id', 'rebel_army_member', 'rebel_army_join_date', 'internationalist', 'phone', 'popular_council', 'termination_date', 'office_id', 'number', 'status'];
    const errors: Record<string, string[]> = {};
    prohibited.forEach((field) => {
      if (body[field] !== undefined) errors[field] = [`The ${field} field is prohibited.`];
    });
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });
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
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    if (c.status !== 'submitted') return HttpResponse.json({ message: 'Case not in submitted state.', status: c.status }, { status: 409 });
    cases.delete(id);
    return HttpResponse.json({ message: 'Case deleted.' });
  }),

  // POST /pension-cases/{id}/salary-records
  http.post(`${API_BASE}/pension-cases/:id/salary-records`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
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
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    c.salary_records = (c.salary_records ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Deleted.' });
  }),

  // POST /pension-cases/{id}/service-records
  http.post(`${API_BASE}/pension-cases/:id/service-records`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const id = nextServiceId++;
    const record = { id, pension_case_id: caseId, entity_id: body.entity_id, entity: { id: body.entity_id as number, code: 'EMP-NEW', name: 'Entidad #' + String(body.entity_id), tax_id_number: 'NIT-NEW' } as never, start_date: body.start_date as string, end_date: (body.end_date as string | null) ?? null, is_appendix: (body.is_appendix as boolean | undefined) ?? false, declaration_form: (body.declaration_form as 'Documental' | 'Testifical' | undefined) ?? 'Documental' } as unknown as ServiceRecord;
    c.service_records = [...(c.service_records ?? []), record];
    cases.set(caseId, c);
    return HttpResponse.json({ data: record }, { status: 201 });
  }),

  // DELETE /pension-cases/{id}/service-records/{record}
  http.delete(`${API_BASE}/pension-cases/:id/service-records/:record`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const recordId = parseInt(params.record as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    c.service_records = (c.service_records ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Deleted.' });
  }),

  // POST /pension-cases/{id}/work-cycles
  http.post(`${API_BASE}/pension-cases/:id/work-cycles`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
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
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    c.work_cycles = (c.work_cycles ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Deleted.' });
  }),

  // POST /pension-cases/{id}/income-concept-records
  http.post(`${API_BASE}/pension-cases/:id/income-concept-records`, async ({ request, params }) => {
    const caseId = parseInt(params.id as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const errors: Record<string, string[]> = {};
    if (!body.income_concept_id) errors.income_concept_id = ['The income concept is required.'];
    if (body.applied_percent === undefined || body.applied_percent === null || body.applied_percent === '') errors.applied_percent = ['The applied percent is required.'];
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });
    const id = nextIncomeId++;
    const record = { id, pension_case_id: caseId, income_concept_id: body.income_concept_id, applied_percent: String(body.applied_percent) } as unknown as IncomeConceptRecord;
    c.income_concept_records = [...(c.income_concept_records ?? []), record];
    cases.set(caseId, c);
    return HttpResponse.json({ data: record }, { status: 201 });
  }),

  // DELETE /pension-cases/{id}/income-concept-records/{record}
  http.delete(`${API_BASE}/pension-cases/:id/income-concept-records/:record`, ({ params }) => {
    const caseId = parseInt(params.id as string, 10);
    const recordId = parseInt(params.record as string, 10);
    const c = cases.get(caseId);
    if (!c) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    c.income_concept_records = (c.income_concept_records ?? []).filter((r) => r.id !== recordId);
    cases.set(caseId, c);
    return HttpResponse.json({ message: 'Deleted.' });
  }),
];
