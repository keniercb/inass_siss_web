import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type PensionCase = components['schemas']['PensionCase'];
type SalaryRecord = components['schemas']['SalaryRecord'];
type ServiceRecord = components['schemas']['ServiceRecord'];
type WorkCycle = components['schemas']['WorkCycle'];

const API_BASE = 'http://localhost:8000/api/v1';

const cases = new Map<number, PensionCase>([
  [1, { id: 1, number: 'EXP-2026-00428', requested_at: '2026-09-15', status: 'submitted', applicant_person_id: 2, office_id: 1, employer_entity_id: 1, position_id: 1, occupational_category_id: 1, educational_level_id: 5, scientific_category_id: 1, last_salary: '5200.00', approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null, computed_amount: null, calculation_setting_id: null, salary_records: [], service_records: [], work_cycles: [], applicant: { id: 2, identity_number: '78092145678', first_name: 'Carlos', first_surname: 'Rodríguez' } } as unknown as PensionCase],
  [2, { id: 2, number: 'EXP-2026-00427', requested_at: '2026-09-14', status: 'under_review', applicant_person_id: 1, office_id: 2, employer_entity_id: 2, position_id: 2, occupational_category_id: 2, educational_level_id: 3, scientific_category_id: 2, last_salary: '4800.00', approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null, computed_amount: null, calculation_setting_id: null, salary_records: [{ id: 1, pension_case_id: 2, year: 2023, earned_salary: '4500.00' } as unknown as SalaryRecord, { id: 2, pension_case_id: 2, year: 2024, earned_salary: '4800.00' } as unknown as SalaryRecord], service_records: [{ id: 1, pension_case_id: 2, entity_id: 1, start_date: '2010-01-01', end_date: '2024-12-31', is_appendix: false } as ServiceRecord], work_cycles: [{ id: 1, pension_case_id: 2, planned_days: 365, actual_days: 350, cycles_count: 1 } as WorkCycle], applicant: { id: 1, identity_number: '85061547812', first_name: 'Ana', first_surname: 'Pérez' } } as unknown as PensionCase],
  [3, { id: 3, number: 'EXP-2026-00426', requested_at: '2026-09-10', status: 'approved', applicant_person_id: 3, office_id: 1, employer_entity_id: 1, position_id: 1, occupational_category_id: 1, educational_level_id: 5, scientific_category_id: 1, last_salary: '6500.00', approval_legal_basis_id: 1, decision_notes: 'Aprobado conforme ley 105', decided_at: '2026-09-20T10:00:00Z', decided_by: 2, computed_amount: '3250.00', calculation_setting_id: 2, salary_records: [{ id: 3, pension_case_id: 3, year: 2024, earned_salary: '6500.00' } as unknown as SalaryRecord], service_records: [{ id: 2, pension_case_id: 3, entity_id: 1, start_date: '2005-01-01', end_date: '2024-12-31', is_appendix: false } as ServiceRecord], work_cycles: [], applicant: { id: 3, identity_number: '65112845679', first_name: 'Josefa', first_surname: 'Martínez' } } as unknown as PensionCase],
  [4, { id: 4, number: 'EXP-2026-00425', requested_at: '2026-09-08', status: 'rejected', applicant_person_id: 5, office_id: 3, employer_entity_id: 3, position_id: 3, occupational_category_id: 3, educational_level_id: 2, scientific_category_id: 3, last_salary: '3200.00', approval_legal_basis_id: null, decision_notes: 'No cumple años mínimos de trabajo', decided_at: '2026-09-15T14:00:00Z', decided_by: 2, computed_amount: null, calculation_setting_id: null, salary_records: [], service_records: [], work_cycles: [], applicant: { id: 5, identity_number: '72051548124', first_name: 'Roberto', first_surname: 'Hernández' } } as unknown as PensionCase],
]);

let nextCaseId = 100;
let nextSalaryId = 100;
let nextServiceId = 100;
let nextCycleId = 100;

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
  http.post(`${API_BASE}/pension-cases`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const errors: Record<string, string[]> = {};
    if (!body.applicant_person_id) errors.applicant_person_id = ['The applicant is required.'];
    if (!body.office_id) errors.office_id = ['The office is required.'];
    if (!body.employer_entity_id) errors.employer_entity_id = ['The employer entity is required.'];
    if (!body.position_id) errors.position_id = ['The position is required.'];
    if (Object.keys(errors).length > 0) return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });

    const id = nextCaseId++;
    const newCase: PensionCase = {
      id, number: `EXP-2026-${String(id).padStart(5, '0')}`, requested_at: new Date().toISOString().split('T')[0],
      status: 'submitted',
      applicant_person_id: body.applicant_person_id as number,
      office_id: body.office_id as number,
      employer_entity_id: body.employer_entity_id as number,
      position_id: body.position_id as number,
      occupational_category_id: body.occupational_category_id as number,
      educational_level_id: body.educational_level_id as number,
      scientific_category_id: body.scientific_category_id as number,
      last_salary: String(body.last_salary ?? '0'),
      approval_legal_basis_id: null, decision_notes: null, decided_at: null, decided_by: null,
      computed_amount: null, calculation_setting_id: null,
      salary_records: [], service_records: [], work_cycles: [],
      applicant: { id: body.applicant_person_id as number, identity_number: '—', first_name: '—', first_surname: '—' },
    } as unknown as PensionCase;
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
    const record = { id, pension_case_id: caseId, entity_id: body.entity_id, start_date: body.start_date, end_date: body.end_date ?? null, is_appendix: body.is_appendix ?? false } as ServiceRecord;
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
];
