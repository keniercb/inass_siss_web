// Tipos del dominio (mirror de los enums del backend)

export type CaseStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';
export type PensionerStatus = 'active' | 'suspended' | 'terminated';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';
export type Sex = 'M' | 'F';

// Metadata de paginación (envelope estándar del backend)
export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

// Labels y colores para los estados del expediente
export const CASE_STATUS_META: Record<CaseStatus, { label: string; badgeClass: string }> = {
  submitted: { label: 'Solicitud', badgeClass: 'badge-submitted' },
  under_review: { label: 'Revisión', badgeClass: 'badge-under_review' },
  approved: { label: 'Aprobado', badgeClass: 'badge-approved' },
  rejected: { label: 'Denegado', badgeClass: 'badge-rejected' },
};

export const PENSIONER_STATUS_META: Record<PensionerStatus, { label: string; badgeClass: string }> = {
  active: { label: 'Activo', badgeClass: 'badge-approved' },
  suspended: { label: 'Suspendido', badgeClass: 'badge-under_review' },
  terminated: { label: 'Terminado', badgeClass: 'badge-rejected' },
};

// === Tipos de Organizaciones y Base Legal (no en OpenAPI todavía, definidos desde el modelo de datos) ===

export interface Entity {
  id: number;
  code: string;
  tax_id_number: string; // NIT
  organization_id: number;
  organization?: { id: number; code: string; name: string };
  province_id: number;
  province?: { id: number; code: string; name: string };
  municipality_id: number;
  municipality?: { id: number; code: string; name: string };
  entity_type_id: number;
  entity_type?: { id: number; code: string; name: string };
  address: string;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  director_person_id?: number | null;
  director?: { id: number; identity_number: string; first_name: string; first_surname: string } | null;
  economic_director_person_id?: number | null;
  economic_director?: { id: number; identity_number: string; first_name: string; first_surname: string } | null;
  parent_entity_id?: number | null;
  parent_entity?: { id: number; code: string; name: string } | null;
  social_purpose?: string | null;
  deactivated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Office {
  id: number;
  type?: { id: number; code: string; name: string };
  province?: { id: number; code: string; name: string };
  municipality?: { id: number; code: string; name: string };
  address: string;
  parent_office_id?: number | null;
  parent?: { id: number; address: string } | null;
  deactivated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthorizedSignature {
  id: number;
  entity_id: number;
  person_id: number;
  person?: { id: number; identity_number: string; first_name: string; first_surname: string };
  position_id: number;
  position?: { id: number; name: string };
  valid_from?: string | null;
  valid_to?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LegalBasis {
  id: number;
  legal_basis_type_id: number;
  legal_basis_type?: { id: number; code: string; name: string };
  number: string;
  issue_date: string;
  effective_date: string;
  derogation_date?: string | null; // null = vigente
  issuing_organization_id: number;
  issuing_organization?: { id: number; code: string; name: string };
  year: number; // derivado de issue_date
  reference?: string | null;
  deactivated_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
