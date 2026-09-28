import { z } from 'zod';
import type { components } from '@/types/api';
import type { CrudConfig } from '@/types/crud';

type Municipality = components['schemas']['Municipality'];

// Schema Zod para municipio
// province_id puede ser null (caso especial Isla de la Juventud)
const baseSchema = z.object({
  code: z.string().min(1).max(4, 'El código debe tener hasta 4 caracteres'),
  name: z.string().min(1).max(80),
  province_id: z.union([z.number().int().positive(), z.null()]),
});

export type MunicipalityInput = z.infer<typeof baseSchema>;

/**
 * CrudConfig para municipios.
 * Usa customFormModal (MunicipalityFormModal) porque el formulario
 * requiere select de provincia con manejo especial de Isla de la Juventud
 * (province_id null).
 */
export const municipalityConfig: CrudConfig<Municipality, MunicipalityInput, MunicipalityInput> = {
  resource: 'municipalities',
  resourceKey: 'municipalities',
  permisoPrefix: 'catalogs',
  endpoints: {
    list: '/municipalities',
    create: '/municipalities',
    detail: (id) => `/municipalities/${id}`,
    update: (id) => `/municipalities/${id}`,
    delete: (id) => `/municipalities/${id}`,
  },
  schemas: {
    create: baseSchema,
    update: baseSchema,
  },
  columns: [
    { id: 'code' },
    { id: 'name' },
    { id: 'province' },
  ],
  fields: [], // No usado porque usamos customFormModal
  search: {
    fields: ['code', 'name'],
    debounce: 300,
    placeholder: 'Buscar por código o nombre…',
  },
  filters: [
    {
      name: 'province_id',
      label: 'Provincia',
      type: 'async-select',
      placeholder: 'Todas',
    },
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
