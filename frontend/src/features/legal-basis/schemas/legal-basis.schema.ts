import { z } from 'zod';

export const legalBasisSchema = z.object({
  legal_basis_type_id: z.number().int().positive('El tipo de base legal es obligatorio'),
  number: z.string().min(1, 'El número es obligatorio').max(30),
  issue_date: z.string().min(1, 'La fecha de emisión es obligatoria'),
  effective_date: z.string().min(1, 'La fecha de vigencia es obligatoria'),
  derogation_date: z.string().optional().nullable(),
  issuing_organization_id: z.number().int().positive('El organismo emisor es obligatorio'),
  reference: z.string().max(255).optional().nullable(),
}).refine((data) => {
  return new Date(data.effective_date) >= new Date(data.issue_date);
}, { message: 'La fecha de vigencia debe ser posterior o igual a la fecha de emisión', path: ['effective_date'] }).refine((data) => {
  if (data.derogation_date) {
    return new Date(data.derogation_date) >= new Date(data.effective_date);
  }
  return true;
}, { message: 'La fecha de derogación debe ser posterior a la fecha de vigencia', path: ['derogation_date'] });

export type LegalBasisInput = z.infer<typeof legalBasisSchema>;
