import type { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import type { PaginatedResponse } from './domain';

/** Definición de un campo del formulario (schema-driven) */
export interface FieldDef<TResource> {
  name: keyof TResource & string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'select' | 'async-select';
  label: string;
  required?: boolean;
  placeholder?: string;
  /** Para type=select: opciones estáticas */
  options?: Array<{ value: string | number; label: string }>;
  /** Para type=async-select: función que carga opciones */
  loadOptions?: (input: string) => Promise<Array<{ value: string | number; label: string }>>;
  /** Condición para mostrar el campo (ej. solo si type='pension-regimes') */
  condition?: (context?: Record<string, string | number>) => boolean;
  /** Deshabilitar en edición (override de inmutableFields) */
  disabledOnEdit?: boolean;
  /** Help text bajo el campo */
  help?: string;
  /** Atributos adicionales */
  min?: number;
  max?: number;
  step?: number;
}

/** Definición de un filtro del listado */
export interface FilterDef {
  name: string;
  label: string;
  type: 'text' | 'select' | 'async-select';
  options?: Array<{ value: string; label: string }>;
  loadOptions?: (input: string) => Promise<Array<{ value: string; label: string }>>;
  placeholder?: string;
}

/** Definición de columna de tabla (wrapper sobre tanstack/react-table) */
export type Column<TResource> = ColumnDef<TResource>;

/** Configuración de búsqueda */
export interface SearchDef<TResource> {
  fields: (keyof TResource)[];
  debounce: number;
  placeholder?: string;
}

/** Permisos RBAC requeridos por acción */
export interface CrudPermisos {
  view: string;
  create: string;
  edit: string;
  delete: string;
}

/** Endpoints REST (path-based bajo /api/v1). Aceptan placeholders tipo :type */
export interface CrudEndpoints {
  list: string;
  create: string;
  detail: (id: number | string) => string;
  update: (id: number | string) => string;
  delete: (id: number | string) => string;
}

/** Hooks de ciclo de vida para extensiones puntuales */
export interface CrudHooks<TResource, TCreateInput, TUpdateInput> {
  beforeCreate?: (input: TCreateInput) => TCreateInput | Promise<TCreateInput>;
  afterCreate?: (resource: TResource) => void;
  beforeUpdate?: (input: TUpdateInput, current: TResource) => TUpdateInput | Promise<TUpdateInput>;
  afterUpdate?: (resource: TResource) => void;
  beforeDelete?: (resource: TResource) => boolean | Promise<boolean>;
  afterDelete?: (id: number | string) => void;
  transformResponse?: (resource: TResource) => TResource;
}

/** Override de invalidación de cache (para invalidación cruzada) */
export interface CrudInvalidateOn<TResource> {
  create?: (queryClient: import('@tanstack/react-query').QueryClient, resource: TResource) => void;
  update?: (
    queryClient: import('@tanstack/react-query').QueryClient,
    resource: TResource,
    id: number | string,
  ) => void;
  delete?: (queryClient: import('@tanstack/react-query').QueryClient, id: number | string) => void;
}

/** Configuración principal del recurso CRUD */
export interface CrudConfig<TResource, TCreateInput, TUpdateInput> {
  /** Identificación */
  resource: string; // 'catalogs' | 'people' | 'entities' | ...
  resourceKey: string; // i18n namespace, e.g. 'catalogs'
  permisoPrefix: string; // 'catalogs' | 'people' | ...

  /** Título personalizado (override de t('list.title')). Si no se setea, usa i18n. */
  title?: string;

  /** Endpoints (aceptan placeholders :type que se reemplazan por context) */
  endpoints: CrudEndpoints;

  /** Contexto dinámico (reemplaza placeholders en endpoints) */
  context?: Record<string, string | number>;

  /** Schemas Zod */
  schemas: {
    create: z.ZodSchema<TCreateInput>;
    update: z.ZodSchema<TUpdateInput>;
    filters?: z.ZodSchema<unknown>;
  };

  /** Columnas de la tabla (tanstack/react-table) */
  columns: Column<TResource>[];

  /** Campos del formulario (schema-driven) */
  fields: FieldDef<TResource>[];

  /** Filtros del listado */
  filters?: FilterDef[];

  /** Búsqueda */
  search?: SearchDef<TResource>;

  /** Permisos RBAC */
  permisos: CrudPermisos;

  /** Campos inmutables tras creación (se deshabilitan en edición) */
  inmutableFields?: (keyof TResource)[];

  /** Etiqueta de acción delete (i18n) */
  deleteLabel?: 'deactivate' | 'remove';

  /** Optimistic locking vía If-Match/ETag */
  optimisticLocking?: boolean;

  /** Idempotency-Key en POST create */
  idempotencyKey?: boolean;

  /** Hooks de ciclo de vida */
  hooks?: CrudHooks<TResource, TCreateInput, TUpdateInput>;

  /** Override de invalidación de cache */
  invalidateOn?: CrudInvalidateOn<TResource>;

  /** Configuración de exportación (opcional) */
  export?: {
    enabled: boolean;
    formats: ('csv' | 'excel')[];
    permiso: string;
    endpoint: string;
  };

  /** Icono del recurso (para sidebar y breadcrumbs) */
  icon?: LucideIcon;
}

export type AnyCrudConfig = CrudConfig<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;

/** Helper para tipar la respuesta de listado paginado */
export type ListResponse<T> = PaginatedResponse<T>;
