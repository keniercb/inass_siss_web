import { z } from 'zod';
import type { components } from '@/types/api';
import type { CrudConfig } from '@/types/crud';

type Agency = components['schemas']['Agency'];

// Schema Zod para agencia
const baseSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(80),
  province_id: z.number().int().positive('La provincia es obligatoria'),
  municipality_id: z.number().int().positive('El municipio es obligatorio'),
  agency_type_id: z.number().int().positive('El tipo de agencia es obligatorio'),
});

export type AgencyInput = z.infer<typeof baseSchema>;

/**
 * CrudConfig para agencias.
 * Usa customFormModal (AgencyFormModal) porque el formulario requiere
 * cascading selects provincia→municipio + tipo de agencia.
 */
export const agencyConfig: CrudConfig<Agency, AgencyInput, AgencyInput> = {
  resource: 'agencies',
  resourceKey: 'agencies',
  permisoPrefix: 'catalogs',
  endpoints: {
    list: '/agencies',
    create: '/agencies',
    detail: (id) => `/agencies/${id}`,
    update: (id) => `/agencies/${id}`,
    delete: (id) => `/agencies/${id}`,
  },
  schemas: {
    create: baseSchema,
    update: baseSchema,
  },
  columns: [
    { id: 'code' },
    { id: 'name' },
    { id: 'type' },
    { id: 'province' },
    { id: 'municipality' },
  ],
  fields: [], // No usado — customFormModal
  search: {
    fields: ['code', 'name'],
    debounce: 300,
    placeholder: 'Buscar por código o nombre…',
  },
  filters: [
    { name: 'province_id', label: 'Provincia', type: 'async-select', placeholder: 'Todas' },
    { name: 'municipality_id', label: 'Municipio', type: 'async-select', placeholder: 'Todos' },
    { name: 'agency_type_id', label: 'Tipo', type: 'async-select', placeholder: 'Todos' },
  ],
  inmutableFields: ['code'],
  permisos: {
    view: 'catalogs.view',
    create: 'catalogs.manage',
    edit: 'catalogs.manage',
    delete: 'catalogs.manage',
  },
  optimisticLocking: true,
  deleteLabel: 'deactivate',
};
