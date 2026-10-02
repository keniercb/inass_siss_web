import { z } from 'zod';
import type { components } from '@/types/api';
import type { CrudConfig } from '@/types/crud';
import type { CatalogType } from './catalog-types';
import { CATALOG_TYPE_LABELS } from './catalog-types';

// Tipo del recurso desde el spec OpenAPI
type CatalogItem = components['schemas']['CatalogItem'];

// Schema base: campos comunes a todos los catálogos
const baseSchema = z.object({
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(80),
  description: z.string().max(255).optional(),
});

// Schemas por tipo (campos condicionales)
const schemasByType: Record<string, z.ZodSchema> = {
  'pension-regimes': baseSchema.extend({
    months_per_year: z.number().int().positive(),
    sector: z.number().int().nullable().optional(),
  }),
  'pension-types': baseSchema.extend({
    deceased_person: z.boolean().default(false),
  }),
  'income-concepts': baseSchema.extend({
    applies_base_salary: z.boolean().default(false),
  }),
  'educational-levels': baseSchema, // sin code
  'beneficiary-types': baseSchema, // sin code
  races: baseSchema, // sin code
};

// Columnas por tipo: code, name, description + extras
function getColumns(type: CatalogType): Array<{ id: string }> {
  const cols = [{ id: 'code' }, { id: 'name' }, { id: 'description' }];
  if (type === 'pension-regimes') cols.push({ id: 'sector' });
  if (type === 'pension-types') cols.push({ id: 'deceased_person' });
  return cols;
}

// Campos del formulario por tipo
function getFields(type: CatalogType): Array<Record<string, unknown>> {
  const baseFields: Array<Record<string, unknown>> = [
    {
      name: 'code',
      type: 'text',
      label: 'catalogs:form.code',
      required: true,
      placeholder: 'BPA0101',
    },
    {
      name: 'name',
      type: 'text',
      label: 'catalogs:form.name',
      required: true,
      placeholder: 'Agencia 1 BPA',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'catalogs:form.description',
      placeholder: 'Descripción del catálogo…',
    },
  ];

  // Campos condicionales por tipo
  if (type === 'pension-regimes') {
    baseFields.push({
      name: 'months_per_year',
      type: 'number',
      label: 'catalogs:form.months_per_year',
      required: true,
      min: 1,
      help: 'Meses por año del régimen de pensión',
    });
    baseFields.push({
      name: 'sector',
      type: 'number',
      label: 'catalogs:form.sector',
      help: 'Sector del régimen de jubilación (opcional)',
    });
  }

  if (type === 'pension-types') {
    baseFields.push({
      name: 'deceased_person',
      type: 'boolean',
      label: 'catalogs:form.deceased_person',
      help: 'Indica si el tipo de pensión aplica a persona fallecida',
    });
  }

  if (type === 'income-concepts') {
    baseFields.push({
      name: 'applies_base_salary',
      type: 'boolean',
      label: 'catalogs:form.applies_base_salary',
      help: 'Indica si participa del salario base de referencia',
    });
  }

  return baseFields;
}

/**
 * Devuelve la CrudConfig para un catálogo específico (identificado por `type`).
 * El `type` se inyecta en el contexto para reemplazar el placeholder `:type`
 * en los endpoints.
 */
export function getCatalogConfig(type: CatalogType): CrudConfig<CatalogItem, unknown, unknown> {
  const schema = schemasByType[type] ?? baseSchema;
  // Etiqueta legible del catálogo (español por defecto; el componente puede
  // re-traducir según el idioma activo si se pasa un i18n key en su lugar)
  const labels = CATALOG_TYPE_LABELS[type];

  return {
    resource: 'catalogs',
    resourceKey: 'catalogs',
    permisoPrefix: 'catalogs',
    // Título dinámico: usa la etiqueta del catálogo (no el genérico "Catálogo")
    title: labels.es,
    endpoints: {
      list: '/catalogs/:type',
      create: '/catalogs/:type',
      detail: (id) => `/catalogs/:type/${id}`,
      update: (id) => `/catalogs/:type/${id}`,
      delete: (id) => `/catalogs/:type/${id}`,
    },
    context: { ':type': type },
    schemas: {
      create: schema as z.ZodSchema<unknown>,
      update: schema as z.ZodSchema<unknown>,
    },
    columns: getColumns(type),
    fields: getFields(type) as never,
    search: {
      fields: ['code', 'name'],
      debounce: 300,
      placeholder: 'Buscar por código o nombre…',
    },
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
}
