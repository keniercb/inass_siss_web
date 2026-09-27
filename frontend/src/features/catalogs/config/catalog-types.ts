// 16 catálogos uniformes cubiertos por el endpoint genérico /api/v1/catalogs/{type}
// (ver docs.json → /catalogs/{type} → operationId: catalogsIndex)
//
// Los catálogos NO incluidos aquí (municipalities, agencies) tienen endpoints
// dedicados con claves compuestas y reglas de coherencia geográfica (RN-04).

export const VALID_CATALOG_TYPES = [
  'provinces',
  'agency-types',
  'organizations',
  'entity-types',
  'office-types',
  'legal-basis-types',
  'scientific-categories',
  'educational-levels',
  'occupational-categories',
  'pension-types',
  'beneficiary-types',
  'races',
  'positions',
  'pension-regimes',
  'payment-types',
  'income-concepts',
] as const;

export type CatalogType = (typeof VALID_CATALOG_TYPES)[number];

export function isCatalogType(value: string): value is CatalogType {
  return (VALID_CATALOG_TYPES as readonly string[]).includes(value);
}

// Etiquetas legibles para mostrar al usuario (i18n keys under catalogs namespace)
export const CATALOG_TYPE_LABELS: Record<CatalogType, { es: string; en: string }> = {
  provinces: { es: 'Provincias', en: 'Provinces' },
  'agency-types': { es: 'Tipos de agencia', en: 'Agency types' },
  organizations: { es: 'Organismos', en: 'Organizations' },
  'entity-types': { es: 'Tipos de entidad', en: 'Entity types' },
  'office-types': { es: 'Tipos de oficina', en: 'Office types' },
  'legal-basis-types': { es: 'Tipos de base legal', en: 'Legal basis types' },
  'scientific-categories': { es: 'Categorías científicas', en: 'Scientific categories' },
  'educational-levels': { es: 'Niveles educacionales', en: 'Educational levels' },
  'occupational-categories': { es: 'Categorías ocupacionales', en: 'Occupational categories' },
  'pension-types': { es: 'Tipos de pensión', en: 'Pension types' },
  'beneficiary-types': { es: 'Tipos de beneficiario', en: 'Beneficiary types' },
  races: { es: 'Razas', en: 'Races' },
  positions: { es: 'Cargos', en: 'Positions' },
  'pension-regimes': { es: 'Régimenes de pensión', en: 'Pension regimes' },
  'payment-types': { es: 'Tipos de pago', en: 'Payment types' },
  'income-concepts': { es: 'Conceptos de ingreso', en: 'Income concepts' },
};
