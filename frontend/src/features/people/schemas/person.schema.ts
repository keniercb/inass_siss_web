import { z } from 'zod';
import { validateCubanCI, type CIValidationError } from '@/lib/cuban-ci';

// Schema Zod para crear/editar una persona
// Nota: NO incluye 'id' (auto-generado), 'deceased' (derivado), 'death_date'
// (se setea en endpoint dedicado POST /people/{id}/death)
export const personSchema = z
  .object({
    identity_number: z
      .string()
      .min(11, 'El CI debe tener 11 dígitos')
      .max(11, 'El CI debe tener 11 dígitos')
      .regex(/^\d{11}$/, 'El CI solo debe contener dígitos'),
    first_name: z.string().min(1, 'El primer nombre es obligatorio').max(50),
    middle_name: z.string().max(50).optional().nullable(),
    first_surname: z.string().min(1, 'El primer apellido es obligatorio').max(50),
    second_surname: z.string().max(50).optional().nullable(),
    sex: z.enum(['M', 'F'], { message: 'El sexo debe ser M o F' }),
    race_id: z.number().int().positive().optional().nullable(),
    address: z.string().min(1, 'La dirección es obligatoria').max(255),
    birth_date: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
    father_name: z.string().max(120).optional().nullable(),
    mother_name: z.string().max(120).optional().nullable(),
    citizen_card_id: z.string().max(30).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Validación avanzada del CI cubano (formato + fecha + dígito verificador)
    const ciError: CIValidationError | null = validateCubanCI(data.identity_number);
    if (ciError) {
      const messages: Record<CIValidationError, string> = {
        invalid_format: 'El formato del CI cubano es inválido (debe ser 11 dígitos)',
        invalid_birth_date: 'La fecha de nacimiento codificada en el CI es inválida',
      };
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['identity_number'],
        message: messages[ciError],
      });
    }

    // Validar que la fecha de nacimiento no sea futura
    const birthDate = new Date(data.birth_date);
    if (birthDate > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['birth_date'],
        message: 'La fecha de nacimiento no puede ser futura',
      });
    }
  });

export type PersonInput = z.infer<typeof personSchema>;

// Schema para registro de fallecimiento
export const deathRegistrationSchema = z
  .object({
    death_date: z.string().min(1, 'La fecha de fallecimiento es obligatoria'),
  })
  .superRefine((data, ctx) => {
    const deathDate = new Date(data.death_date);
    if (deathDate > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['death_date'],
        message: 'La fecha de fallecimiento no puede ser futura',
      });
    }
  });

export type DeathRegistrationInput = z.infer<typeof deathRegistrationSchema>;
