import { z } from 'zod';

/**
 * Schemas Zod — módulo Instrumentos de Pago (spec 1.47.0).
 *
 * Espejo read-only del schema PaymentInstrument + payloads tipados para los
 * 3 endpoints de escritura. Sin lógica de negocio: la matriz de transición
 * aquí es solo UX (esconder destinos imposibles); el backend la valida con 422.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Estados y tipos (enums del backend)
// ─────────────────────────────────────────────────────────────────────────────

export const INSTRUMENT_STATUSES = ['created', 'pending', 'paid', 'expired', 'cancelled'] as const;
export const INSTRUMENT_TYPES = ['provisional_payment', 'electronic_check'] as const;

export type InstrumentStatus = (typeof INSTRUMENT_STATUSES)[number];
export type InstrumentType = (typeof INSTRUMENT_TYPES)[number];

/**
 * Matriz del operador declarada por el backend:
 *   created → pending | cancelled
 *   pending → paid | expired
 *   paid / expired / cancelled → terminales
 *
 * Se usa para ocultar destinos imposibles en la UI. El backend rechaza con
 * 422 cualquier movimiento fuera de esta matriz.
 */
export const TRANSITION_MATRIX: Record<InstrumentStatus, InstrumentStatus[]> = {
  created: ['pending', 'cancelled'],
  pending: ['paid', 'expired'],
  paid: [],
  expired: [],
  cancelled: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Proyecciones embebidas
// ─────────────────────────────────────────────────────────────────────────────

export const instrumentPensionerSchema = z.object({
  id: z.number().int(),
  person: z
    .object({
      id: z.number().int(),
      full_name: z.string(),
    })
    .nullable(),
  status: z.enum(['active', 'suspended', 'terminated']),
  amount: z.string(),
});

export const instrumentBeneficiarySchema = z.object({
  id: z.number().int(),
  full_name: z.string(),
});

/** Pago del ledger vinculado (proyección embebida en associated_payments) */
export const associatedPaymentSchema = z.object({
  id: z.number().int(),
  period: z.string(),
  amount: z.string(),
  status: z.string(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PaymentInstrument (ficha completa)
// ─────────────────────────────────────────────────────────────────────────────

export const paymentInstrumentSchema = z.object({
  id: z.number().int(),
  pensioner_id: z.number().int(),
  pensioner: instrumentPensionerSchema.nullable(),
  beneficiary: instrumentBeneficiarySchema.nullable(),
  amount: z.string(),
  type: z.enum(INSTRUMENT_TYPES),
  status: z.enum(INSTRUMENT_STATUSES),
  set_expired_at: z.string().date().nullable(),
  paid_at: z.string().date().nullable(),
  associated_payments: z.array(associatedPaymentSchema),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type PaymentInstrument = z.infer<typeof paymentInstrumentSchema>;
export type AssociatedPayment = z.infer<typeof associatedPaymentSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Parámetros de listado y payloads de escritura
// ─────────────────────────────────────────────────────────────────────────────

export const instrumentListParamsSchema = z.object({
  status: z.enum(INSTRUMENT_STATUSES).optional(),
  type: z.enum(INSTRUMENT_TYPES).optional(),
  pensioner_id: z.number().int().optional(),
  page: z.number().int().optional(),
  per_page: z.number().int().optional(),
});

export type InstrumentListParams = Partial<z.infer<typeof instrumentListParamsSchema>>;

/** POST /payment-instruments — creación */
export const createInstrumentSchema = z.object({
  pensioner_id: z.number().int(),
  beneficiary_person_id: z.number().int(),
  type: z.enum(INSTRUMENT_TYPES),
});

export type CreateInstrumentInput = z.infer<typeof createInstrumentSchema>;

/** POST /payment-instruments/{id}/payments — asociar pago del ledger */
export const associatePaymentSchema = z.object({
  payment_id: z.number().int(),
});

export type AssociatePaymentInput = z.infer<typeof associatePaymentSchema>;

/** POST /payment-instruments/{id}/status — transición (created nunca es destino) */
export const instrumentTransitionSchema = z.object({
  status: z.enum(['pending', 'paid', 'expired', 'cancelled']),
});

export type InstrumentTransitionInput = z.infer<typeof instrumentTransitionSchema>;
