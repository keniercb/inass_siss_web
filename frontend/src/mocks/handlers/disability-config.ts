import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type DisabilityRule = components['schemas']['DisabilityRule'];
type DisabilityIncrementBracket = components['schemas']['DisabilityIncrementBracket'];
type SpecialDisabilityModification = components['schemas']['SpecialDisabilityModification'];
type BeneficiaryRule = components['schemas']['BeneficiaryRule'];

const API_BASE = 'http://localhost:8000/api/v1';

// Seeds: 5 reglas (una por origen) con brackets anidados
const rules = new Map<number, DisabilityRule>([
  [1, { id: 1, origin: 'comun', base_percent: '50', increment_percent: '1', brackets: [
    { id: 1, disability_rule_id: 1, min_years: 0, max_years: 20, annual_increment_percent: 0.01 } as DisabilityIncrementBracket,
    { id: 2, disability_rule_id: 1, min_years: 21, max_years: 30, annual_increment_percent: 0.02 } as DisabilityIncrementBracket,
    { id: 3, disability_rule_id: 1, min_years: 31, max_years: null, annual_increment_percent: 0.02 } as DisabilityIncrementBracket,
  ] } as DisabilityRule],
  [2, { id: 2, origin: 'profesional', base_percent: '60', increment_percent: '2', brackets: [
    { id: 4, disability_rule_id: 2, min_years: 0, max_years: 30, annual_increment_percent: 0.02 } as DisabilityIncrementBracket,
    { id: 5, disability_rule_id: 2, min_years: 31, max_years: null, annual_increment_percent: 0.02 } as DisabilityIncrementBracket,
  ] } as DisabilityRule],
  [3, { id: 3, origin: 'accidente_trabajo', base_percent: '60', increment_percent: '2', brackets: [
    { id: 6, disability_rule_id: 3, min_years: 0, max_years: 30, annual_increment_percent: 0.02 } as DisabilityIncrementBracket,
    { id: 7, disability_rule_id: 3, min_years: 31, max_years: null, annual_increment_percent: 0.02 } as DisabilityIncrementBracket,
  ] } as DisabilityRule],
  [4, { id: 4, origin: 'accidente_trayecto', base_percent: '60', increment_percent: '2', brackets: [
    { id: 8, disability_rule_id: 4, min_years: 0, max_years: 30, annual_increment_percent: 0.02 } as DisabilityIncrementBracket,
  ] } as DisabilityRule],
  [5, { id: 5, origin: 'fallecimiento', base_percent: '50', increment_percent: '0', brackets: [] } as DisabilityRule],
]);

// Seeds: modificaciones especiales
const specialModifications = new Map<number, SpecialDisabilityModification>([
  [1, { id: 1, code: 'CUIDADO', description: 'Incremento por requerir cuidado de otra persona', percent_to_apply: '20' } as SpecialDisabilityModification],
  [2, { id: 2, code: 'HEROICO', description: 'Incremento por acto heroico', percent_to_apply: '20' } as SpecialDisabilityModification],
]);

// Seeds: reglas de beneficiario por rango de cantidades
const beneficiaryRules = new Map<number, BeneficiaryRule>([
  [1, { id: 1, min_quantity: 1, max_quantity: 1, percent_to_apply: '50' } as BeneficiaryRule],
  [2, { id: 2, min_quantity: 2, max_quantity: 2, percent_to_apply: '70' } as BeneficiaryRule],
  [3, { id: 3, min_quantity: 3, max_quantity: 4, percent_to_apply: '80' } as BeneficiaryRule],
  [4, { id: 4, min_quantity: 5, max_quantity: null, percent_to_apply: '90' } as BeneficiaryRule],
]);

let nextRuleId = 100;
let nextBracketId = 100;
let nextSpecialId = 100;
let nextBeneficiaryId = 100;

function paginate<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  const start = (page - 1) * perPage;
  return { data: items.slice(start, start + perPage), meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) } };
}

export const disabilityConfigHandlers = [
  // === Disability Rules ===
  http.get(`${API_BASE}/disability-rules`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const items = Array.from(rules.values()).sort((a, b) => String(a.origin).localeCompare(String(b.origin)));
    return HttpResponse.json(paginate(items, page, perPage));
  }),

  http.post(`${API_BASE}/disability-rules`, async ({ request }) => {
    const body = (await request.json()) as { origin?: string; base_percent?: string; increment_percent?: string; brackets?: Array<{ min_years: number; max_years: number | null; annual_increment_percent: number }> };
    if (!body.origin || !body.base_percent || !body.increment_percent) {
      return HttpResponse.json({ message: 'Faltan campos obligatorios.', errors: { origin: !body.origin ? ['El origen es obligatorio.'] : [], base_percent: !body.base_percent ? ['El porciento base es obligatorio.'] : [] } }, { status: 422 });
    }
    // Unicidad de origen
    if (Array.from(rules.values()).some(r => r.origin === body.origin)) {
      return HttpResponse.json({ message: 'Ya existe una regla para ese origen.', errors: { origin: ['Ya existe una regla para ese origen.'] } }, { status: 422 });
    }
    const id = ++nextRuleId;
    const brackets = (body.brackets ?? []).map(b => ({ id: ++nextBracketId, disability_rule_id: id, min_years: b.min_years, max_years: b.max_years, annual_increment_percent: b.annual_increment_percent }));
    const rule = { id, origin: body.origin, base_percent: body.base_percent, increment_percent: body.increment_percent, brackets } as DisabilityRule;
    rules.set(id, rule);
    return HttpResponse.json({ data: rule }, { status: 201 });
  }),

  http.get(`${API_BASE}/disability-rules/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const rule = rules.get(id);
    if (!rule) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: rule });
  }),

  http.patch(`${API_BASE}/disability-rules/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const rule = rules.get(id);
    if (!rule) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const body = (await request.json()) as { base_percent?: string; increment_percent?: string; brackets?: Array<{ min_years: number; max_years: number | null; annual_increment_percent: number }> };
    const updated = {
      ...rule,
      ...(body.base_percent ? { base_percent: body.base_percent } : {}),
      ...(body.increment_percent ? { increment_percent: body.increment_percent } : {}),
      ...(body.brackets ? { brackets: body.brackets.map(b => ({ id: ++nextBracketId, disability_rule_id: id, min_years: b.min_years, max_years: b.max_years, annual_increment_percent: b.annual_increment_percent })) } : {}),
    } as DisabilityRule;
    rules.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  http.delete(`${API_BASE}/disability-rules/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    if (!rules.has(id)) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    rules.delete(id);
    return HttpResponse.json({ message: 'Eliminado.' });
  }),

  // === Special Disability Modifications ===
  http.get(`${API_BASE}/special-disability-modifications`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const items = Array.from(specialModifications.values());
    return HttpResponse.json(paginate(items, page, perPage));
  }),

  http.post(`${API_BASE}/special-disability-modifications`, async ({ request }) => {
    const body = (await request.json()) as { code?: string; description?: string; percent_to_apply?: string };
    if (!body.code || !body.percent_to_apply) {
      return HttpResponse.json({ message: 'Faltan campos obligatorios.', errors: { code: !body.code ? ['El código es obligatorio.'] : [], percent_to_apply: !body.percent_to_apply ? ['El porciento es obligatorio.'] : [] } }, { status: 422 });
    }
    if (Array.from(specialModifications.values()).some(m => m.code === body.code)) {
      return HttpResponse.json({ message: 'El código ya está en uso.', errors: { code: ['El código ya está en uso.'] } }, { status: 422 });
    }
    const id = ++nextSpecialId;
    const mod = { id, code: body.code, description: body.description ?? null, percent_to_apply: body.percent_to_apply } as SpecialDisabilityModification;
    specialModifications.set(id, mod);
    return HttpResponse.json({ data: mod }, { status: 201 });
  }),

  http.get(`${API_BASE}/special-disability-modifications/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const mod = specialModifications.get(id);
    if (!mod) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: mod });
  }),

  http.patch(`${API_BASE}/special-disability-modifications/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const mod = specialModifications.get(id);
    if (!mod) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const body = (await request.json()) as { description?: string; percent_to_apply?: string };
    const updated = { ...mod, ...(body.description !== undefined ? { description: body.description } : {}), ...(body.percent_to_apply ? { percent_to_apply: body.percent_to_apply } : {}) } as SpecialDisabilityModification;
    specialModifications.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  http.delete(`${API_BASE}/special-disability-modifications/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    if (!specialModifications.has(id)) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    specialModifications.delete(id);
    return HttpResponse.json({ message: 'Eliminado.' });
  }),

  // === Beneficiary Rules ===
  http.get(`${API_BASE}/beneficiary-rules`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const items = Array.from(beneficiaryRules.values()).sort((a, b) => (a.min_quantity ?? 0) - (b.min_quantity ?? 0));
    return HttpResponse.json(paginate(items, page, perPage));
  }),

  http.post(`${API_BASE}/beneficiary-rules`, async ({ request }) => {
    const body = (await request.json()) as { min_quantity?: number; max_quantity?: number | null; percent_to_apply?: string };
    if (body.min_quantity == null || !body.percent_to_apply) {
      return HttpResponse.json({ message: 'Faltan campos obligatorios.', errors: { min_quantity: body.min_quantity == null ? ['La cantidad mínima es obligatoria.'] : [], percent_to_apply: !body.percent_to_apply ? ['El porciento es obligatorio.'] : [] } }, { status: 422 });
    }
    const id = ++nextBeneficiaryId;
    const rule = { id, min_quantity: body.min_quantity, max_quantity: body.max_quantity ?? null, percent_to_apply: body.percent_to_apply } as BeneficiaryRule;
    beneficiaryRules.set(id, rule);
    return HttpResponse.json({ data: rule }, { status: 201 });
  }),

  http.get(`${API_BASE}/beneficiary-rules/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const rule = beneficiaryRules.get(id);
    if (!rule) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    return HttpResponse.json({ data: rule });
  }),

  http.patch(`${API_BASE}/beneficiary-rules/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const rule = beneficiaryRules.get(id);
    if (!rule) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    const body = (await request.json()) as { min_quantity?: number; max_quantity?: number | null; percent_to_apply?: string };
    const updated = { ...rule, ...(body.min_quantity != null ? { min_quantity: body.min_quantity } : {}), ...(body.max_quantity !== undefined ? { max_quantity: body.max_quantity } : {}), ...(body.percent_to_apply ? { percent_to_apply: body.percent_to_apply } : {}) } as BeneficiaryRule;
    beneficiaryRules.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  http.delete(`${API_BASE}/beneficiary-rules/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    if (!beneficiaryRules.has(id)) return HttpResponse.json({ message: 'No encontrado.' }, { status: 404 });
    beneficiaryRules.delete(id);
    return HttpResponse.json({ message: 'Eliminado.' });
  }),
];
