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
  'agency-types': baseSchema.extend({
    payment_form: z.enum(['tarjeta magnetica', 'nomina electronica']).default('tarjeta magnetica'),
  }),
  'pension-regimes': baseSchema.extend({
    months_per_year: z.number().int().positive(),
    sector: z.number().int().nullable().optional(),
    // Task 50 (S7 reajuste): parámetros de cálculo por régimen
    base_calc_percent: z.number().min(0).max(1).optional(),
    annual_increase_percent: z.number().min(0).max(1).optional(),
    limit_percent: z.number().min(0).max(1).optional(),
    min_work_years: z.number().int().min(1).optional(),
    min_age_men: z.number().int().min(1).optional(),
    min_age_women: z.number().int().min(1).optional(),
    required_salary_records: z.number().int().min(1).max(15).optional(),
    average_strategy: z.enum(['best_n', 'last_n', 'all']).optional(),
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
  if (type === 'agency-types') cols.push({ id: 'payment_form' });
  if (type === 'pension-regimes') {
    cols.push({ id: 'sector' });
    cols.push({ id: 'min_work_years' });
    cols.push({ id: 'min_age_men' });
    cols.push({ id: 'min_age_women' });
    cols.push({ id: 'base_calc_percent' });
  }
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
  if (type === 'agency-types') {
    baseFields.push({
      name: 'payment_form',
      type: 'select',
      label: 'catalogs:form.payment_form',
      help: 'Forma de pago del cobro',
      options: [
        { value: 'tarjeta magnetica', label: 'Tarjeta magnética' },
        { value: 'nomina electronica', label: 'Nómina electrónica' },
      ],
      default: 'tarjeta magnetica',
    });
  }

  if (type === 'pension-regimes') {
    baseFields.push({
      name: 'months_per_year',
      type: 'number',
      label: 'catalogs:form.months_per_year',
      required: true,
      min: 1,
      help: 'catalogs:form.months_per_year_help',
    });
    baseFields.push({
      name: 'sector',
      type: 'number',
      label: 'catalogs:form.sector',
      help: 'catalogs:form.sector_help',
    });
    // Task 50 (S7 reajuste): parámetros de cálculo del régimen
    baseFields.push({
      name: 'base_calc_percent',
      type: 'number',
      label: 'catalogs:form.base_calc_percent',
      min: 0,
      max: 1,
      step: 0.01,
      help: 'catalogs:form.base_calc_percent_help',
    });
    baseFields.push({
      name: 'annual_increase_percent',
      type: 'number',
      label: 'catalogs:form.annual_increase_percent',
      min: 0,
      max: 1,
      step: 0.01,
      help: 'catalogs:form.annual_increase_percent_help',
    });
    baseFields.push({
      name: 'limit_percent',
      type: 'number',
      label: 'catalogs:form.limit_percent',
      min: 0,
      max: 1,
      step: 0.01,
      help: 'catalogs:form.limit_percent_help',
    });
    baseFields.push({
      name: 'min_work_years',
      type: 'number',
      label: 'catalogs:form.min_work_years',
      min: 1,
      help: 'catalogs:form.min_work_years_help',
    });
    baseFields.push({
      name: 'min_age_men',
      type: 'number',
      label: 'catalogs:form.min_age_men',
      min: 1,
      help: 'catalogs:form.min_age_men_help',
    });
    baseFields.push({
      name: 'min_age_women',
      type: 'number',
      label: 'catalogs:form.min_age_women',
      min: 1,
      help: 'catalogs:form.min_age_women_help',
    });
    baseFields.push({
      name: 'required_salary_records',
      type: 'number',
      label: 'catalogs:form.required_salary_records',
      min: 1,
      max: 15,
      help: 'catalogs:form.required_salary_records_help',
    });
    baseFields.push({
      name: 'average_strategy',
      type: 'select',
      label: 'catalogs:form.average_strategy',
      help: 'catalogs:form.average_strategy_help',
      options: [
        { value: 'best_n', label: 'Mejores N' },
        { value: 'last_n', label: 'Últimos N' },
        { value: 'all', label: 'Todos' },
      ],
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
