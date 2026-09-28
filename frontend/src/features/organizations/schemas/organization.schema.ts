import { z } from 'zod';

export const entitySchema = z.object({
  code: z.string().min(1, 'El código es obligatorio').max(15),
  tax_id_number: z.string().min(1, 'El NIT es obligatorio').max(20),
  organization_id: z.number().int().positive('El organismo es obligatorio'),
  province_id: z.number().int().positive('La provincia es obligatoria'),
  municipality_id: z.number().int().positive('El municipio es obligatorio'),
  entity_type_id: z.number().int().positive('El tipo de entidad es obligatorio'),
  address: z.string().min(1, 'La dirección es obligatoria').max(255),
  phone: z.string().max(20).optional().nullable(),
  fax: z.string().max(20).optional().nullable(),
  email: z.string().email('El email no es válido').max(100).optional().nullable(),
  director_person_id: z.number().int().positive().optional().nullable(),
  economic_director_person_id: z.number().int().positive().optional().nullable(),
  parent_entity_id: z.number().int().positive().optional().nullable(),
  social_purpose: z.string().max(1000).optional().nullable(),
});

export type EntityInput = z.infer<typeof entitySchema>;

export const officeSchema = z.object({
  office_type_id: z.number().int().positive('El tipo de oficina es obligatorio'),
  province_id: z.number().int().positive('La provincia es obligatoria'),
  municipality_id: z.number().int().positive('El municipio es obligatorio'),
  address: z.string().min(1, 'La dirección es obligatoria').max(255),
  parent_office_id: z.number().int().positive().optional().nullable(),
});

export type OfficeInput = z.infer<typeof officeSchema>;

export const authorizedSignatureSchema = z.object({
  entity_id: z.number().int().positive(),
  person_id: z.number().int().positive('La persona es obligatoria'),
  position_id: z.number().int().positive('El cargo es obligatorio'),
  valid_from: z.string().optional().nullable(),
  valid_to: z.string().optional().nullable(),
}).refine((data) => {
  if (data.valid_from && data.valid_to) {
    return new Date(data.valid_to) >= new Date(data.valid_from);
  }
  return true;
}, { message: 'La fecha de fin debe ser posterior a la fecha de inicio', path: ['valid_to'] });

export type AuthorizedSignatureInput = z.infer<typeof authorizedSignatureSchema>;
