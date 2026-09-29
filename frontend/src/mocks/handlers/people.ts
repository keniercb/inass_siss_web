import { http, HttpResponse } from 'msw';
import type { components } from '@/types/api';

type Person = components['schemas']['Person'];

const API_BASE = 'http://localhost:8000/api/v1';

// CI: solo validar 11 dígitos (la validación sustantiva la hace el backend real)
const CI_REGEX = /^\d{11}$/;

// 10 personas sembradas con CI cubanos válidos (verificados por el algoritmo del frontend)
// Los CI son ficticios pero pasan validación básica de formato
const seedPersons: Person[] = [
  // CI válido ficticio: 85 0615 4781 2 (nací 1985-06-15, mujer)
  {
    id: 1, identity_number: '85061547812', first_name: 'Ana', middle_name: 'María',
    first_surname: 'Pérez', second_surname: 'González', sex: 'F', race_id: 1,
    address: 'Calle 23 #45, Vedado, La Habana', birth_date: '1985-06-15', death_date: null,
    father_name: 'Pedro Pérez', mother_name: 'María González', citizen_card_id: null,
    deceased: false,
  },
  // 78 0921 4567 8 (hombre nacido 1978-09-21)
  {
    id: 2, identity_number: '78092145678', first_name: 'Carlos', middle_name: null,
    first_surname: 'Rodríguez', second_surname: 'Gómez', sex: 'M', race_id: 3,
    address: 'Av. 51 #1206, Marianao, La Habana', birth_date: '1978-09-21', death_date: null,
    father_name: 'Juan Rodríguez', mother_name: 'Ana Gómez', citizen_card_id: null,
    deceased: false,
  },
  // 65 1128 4567 9 (mujer 1965-11-28, fallecida)
  {
    id: 3, identity_number: '65112845679', first_name: 'Josefa', middle_name: null,
    first_surname: 'Martínez', second_surname: 'López', sex: 'F', race_id: 2,
    address: 'Calle Reina #508, Centro Habana', birth_date: '1965-11-28', death_date: '2024-03-12',
    father_name: null, mother_name: null, citizen_card_id: null,
    deceased: true,
  },
  // 89 0212 5612 3 (hombre 1989-02-12 — fecha corregida)
  {
    id: 4, identity_number: '89021256123', first_name: 'Pedro', middle_name: 'Luis',
    first_surname: 'Sánchez', second_surname: 'Romero', sex: 'M', race_id: 1,
    address: 'Calle Máximo Gómez #12, Holguín', birth_date: '1989-02-12', death_date: null,
    father_name: 'Luis Sánchez', mother_name: 'Carmen Romero', citizen_card_id: null,
    deceased: false,
  },
  // 72 0515 4812 4 (hombre 1972-05-15)
  {
    id: 5, identity_number: '72051548124', first_name: 'Roberto', middle_name: null,
    first_surname: 'Hernández', second_surname: 'Suárez', sex: 'M', race_id: 4,
    address: 'Calle Maceo #200, Santiago de Cuba', birth_date: '1972-05-15', death_date: null,
    father_name: null, mother_name: null, citizen_card_id: 'FC-001-2024',
    deceased: false,
  },
  // 92 0510 4789 1 (mujer 1992-05-10)
  {
    id: 6, identity_number: '92051047891', first_name: 'María', middle_name: 'Elena',
    first_surname: 'García', second_surname: 'Suárez', sex: 'F', race_id: 2,
    address: 'Calle 5ta #501, Miramar, La Habana', birth_date: '1992-05-10', death_date: null,
    father_name: 'José García', mother_name: 'Elena Suárez', citizen_card_id: null,
    deceased: false,
  },
  // 56 0430 1234 5 (hombre 1956-04-30)
  {
    id: 7, identity_number: '56043012345', first_name: 'Juan', middle_name: null,
    first_surname: 'Pérez', second_surname: 'García', sex: 'M', race_id: 1,
    address: 'Calle Luz #44, Habana Vieja', birth_date: '1956-04-30', death_date: '2025-01-15',
    father_name: null, mother_name: null, citizen_card_id: null,
    deceased: true,
  },
  // 81 0305 4789 1 (mujer 1981-03-05)
  {
    id: 8, identity_number: '81030547891', first_name: 'Lucía', middle_name: 'del Carmen',
    first_surname: 'Hernández', second_surname: 'Pérez', sex: 'F', race_id: 3,
    address: 'Av. 26 #1505, Nuevo Vedado, La Habana', birth_date: '1981-03-05', death_date: null,
    father_name: null, mother_name: null, citizen_card_id: null,
    deceased: false,
  },
  // 70 0312 5678 9 (hombre 1970-03-12)
  {
    id: 9, identity_number: '70031256789', first_name: 'Miguel', middle_name: 'Ángel',
    first_surname: 'Torres', second_surname: 'Díaz', sex: 'M', race_id: 1,
    address: 'Calle San Pedro #45, Camagüey', birth_date: '1970-03-12', death_date: null,
    father_name: 'Manuel Torres', mother_name: 'Rosa Díaz', citizen_card_id: null,
    deceased: false,
  },
  // 88 0125 4567 2 (mujer 1988-01-25)
  {
    id: 10, identity_number: '88012545672', first_name: 'Caridad', middle_name: null,
    first_surname: 'Núñez', second_surname: 'López', sex: 'F', race_id: 2,
    address: 'Calle Martí #78, Santa Clara', birth_date: '1988-01-25', death_date: null,
    father_name: null, mother_name: null, citizen_card_id: null,
    deceased: false,
  },
];

const persons = new Map<number, Person>(seedPersons.map((p) => [p.id!, p!]));
let nextId = 1000;

export const peopleHandlers = [
  // GET /people — listado con búsqueda y filtros
  http.get(`${API_BASE}/people`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(url.searchParams.get('per_page') ?? '15', 10);
    const search = url.searchParams.get('search') ?? '';
    const sort = url.searchParams.get('sort') ?? 'first_surname';
    const order = url.searchParams.get('order') ?? 'asc';

    let items = Array.from(persons.values());

    // Filtro deceased: acepta true/false/0/1 desde el frontend
    const deceased = url.searchParams.get('deceased');
    if (deceased === 'true' || deceased === '1') items = items.filter((p) => p.deceased);
    else if (deceased === 'false' || deceased === '0') items = items.filter((p) => !p.deceased);

    // Búsqueda: si es 11 dígitos, búsqueda por CI exacto; si no, por nombre
    if (search) {
      if (/^\d{11}$/.test(search)) {
        items = items.filter((p) => p.identity_number === search);
      } else {
        const q = search.toLowerCase();
        items = items.filter((p) => {
          const fullName = [p.first_surname, p.second_surname, p.first_name, p.middle_name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return fullName.includes(q);
        });
      }
    }

    // Sort
    items.sort((a, b) => {
      const av = String(a[sort as keyof Person] ?? '');
      const bv = String(b[sort as keyof Person] ?? '');
      return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const total = items.length;
    const start = (page - 1) * perPage;
    const paged = items.slice(start, start + perPage);

    return HttpResponse.json({
      data: paged,
      meta: { current_page: page, per_page: perPage, total, last_page: Math.max(1, Math.ceil(total / perPage)) },
    });
  }),

  // POST /people — crear persona con validación de CI cubano
  http.post(`${API_BASE}/people`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    // Validar CI: solo formato (11 dígitos). El backend real valida fecha + verificador.
    if (!body.identity_number || !CI_REGEX.test(body.identity_number as string)) {
      return HttpResponse.json(
        { message: 'Validation error.', errors: { identity_number: ['El CI debe tener 11 dígitos numéricos'] } },
        { status: 422 },
      );
    }

    // Validar campos requeridos
    const errors: Record<string, string[]> = {};
    if (!body.first_name) errors.first_name = ['The first name field is required.'];
    if (!body.first_surname) errors.first_surname = ['The first surname field is required.'];
    if (!body.sex) errors.sex = ['The sex field is required.'];
    if (!body.birth_date) errors.birth_date = ['The birth date field is required.'];
    if (!body.address) errors.address = ['The address field is required.'];

    if (Object.keys(errors).length > 0) {
      return HttpResponse.json({ message: 'Validation error.', errors }, { status: 422 });
    }

    // Unicidad del CI
    if (Array.from(persons.values()).some((p) => p.identity_number === body.identity_number)) {
      return HttpResponse.json(
        { message: 'A person with that identity number already exists.' },
        { status: 409 },
      );
    }

    const id = nextId++;
    const person: Person = {
      id,
      identity_number: body.identity_number as string,
      first_name: body.first_name as string,
      middle_name: (body.middle_name as string) || null,
      first_surname: body.first_surname as string,
      second_surname: (body.second_surname as string) || null,
      sex: body.sex as 'M' | 'F',
      race_id: (body.race_id as number) ?? null,
      address: body.address as string,
      birth_date: body.birth_date as string,
      death_date: null,
      father_name: (body.father_name as string) || null,
      mother_name: (body.mother_name as string) || null,
      citizen_card_id: (body.citizen_card_id as string) || null,
      deceased: false,
    };
    persons.set(id, person);
    return HttpResponse.json({ data: person }, { status: 201 });
  }),

  // GET /people/{id}
  http.get(`${API_BASE}/people/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const person = persons.get(id);
    if (!person) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    return HttpResponse.json({ data: person });
  }),

  // PATCH /people/{id} — identity_number inmutable
  http.patch(`${API_BASE}/people/:id`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const person = persons.get(id);
    if (!person) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });

    const body = (await request.json()) as Record<string, unknown>;

    // Validar CI inmutable
    if (body.identity_number !== undefined && body.identity_number !== person.identity_number) {
      return HttpResponse.json(
        { message: 'The identity number cannot be modified after creation.', errors: { identity_number: ['The identity number cannot be modified after creation.'] } },
        { status: 422 },
      );
    }

    const updated: Person = { ...person, ...body, updated_at: new Date().toISOString() } as Person;
    persons.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),

  // DELETE /people/{id}
  http.delete(`${API_BASE}/people/:id`, ({ params }) => {
    const id = parseInt(params.id as string, 10);
    const person = persons.get(id);
    if (!person) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });
    if (id <= 10) {
      return HttpResponse.json(
        { message: 'Cannot deactivate: there are records referencing this person.' },
        { status: 409 },
      );
    }
    return HttpResponse.json({ message: 'Deactivated.' });
  }),

  // POST /people/{id}/death — registrar fallecimiento
  http.post(`${API_BASE}/people/:id/death`, async ({ request, params }) => {
    const id = parseInt(params.id as string, 10);
    const person = persons.get(id);
    if (!person) return HttpResponse.json({ message: 'Not found.' }, { status: 404 });

    if (person.deceased) {
      return HttpResponse.json({ message: 'Person is already deceased.' }, { status: 409 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (!body.death_date) {
      return HttpResponse.json(
        { message: 'Validation error.', errors: { death_date: ['The death date field is required.'] } },
        { status: 422 },
      );
    }

    // Validar death_date > birth_date
    if (new Date(body.death_date as string) < new Date(person.birth_date!)) {
      return HttpResponse.json(
        { message: 'Death date must be after birth date.', errors: { death_date: ['Death date must be after birth date.'] } },
        { status: 422 },
      );
    }

    const updated: Person = { ...person, death_date: body.death_date as string, deceased: true };
    persons.set(id, updated);
    return HttpResponse.json({ data: updated });
  }),
];
