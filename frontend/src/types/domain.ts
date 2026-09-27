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
