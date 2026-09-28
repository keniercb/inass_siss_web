import { z } from 'zod';

// Schema Zod para crear/editar una persona.
// El frontend SOLO valida formato del CI (11 dígitos).
// La validación de fecha de nacimiento, dígito verificador y unicidad
// la hace el backend con el algoritmo oficial cubano (RF-SEG-001).
export const personSchema = z.object({
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
