import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Search as SearchIcon, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PersonFormModal } from './PersonFormModal';
import { isValidCubanCI } from '@/lib/cuban-ci';
import { http } from '@/lib/http';
import type { components } from '@/types/api';

type Person = components['schemas']['Person'];

/** Persona resumida devuelta por GET /people (listado con search) */
export interface PersonListItem {
  id: number;
  identity_number: string;
  first_name: string;
  first_surname: string;
}

interface PersonSearchWithCreateProps {
  /** Etiqueta visible del campo */
  label: string;
  /** Placeholder del input */
  placeholder?: string;
  /** Valor inicial del input (caso de edición: "Ana Pérez (85061547812)") */
  initialDisplayValue?: string;
  /** Si la persona ya está seleccionada al montar, su ID (para mostrar indicador ✓) */
  initialSelectedId?: number | null;
  /** Si el campo es obligatorio (afecta el asterisco visual) */
  required?: boolean;
  /** Callback cuando se selecciona una persona (existente o recién creada) */
  onSelect: (person: PersonListItem) => void;
}

/**
 * Componente reutilizable de búsqueda de persona con opción "registrar nueva"
 * cuando el CI no se encuentra en el registro único.
 *
 * Flujo UX:
 *  1. El usuario escribe un CI o nombre (mínimo 3 caracteres).
 *  2. Se ejecuta GET /people?search=... con debounce de 300ms.
 *  3. Si hay resultados: dropdown con todas las coincidencias.
 *  4. Si NO hay resultados Y el texto es un CI cubano válido (11 dígitos):
 *     panel "No se encontró persona con CI XXX" + botón "Registrar nueva".
 *  5. Al hacer clic: abre PersonFormModal como modal-sobre-modal con el CI
 *     pre-cargado. Tras crear, llama onSelect(person) y cierra el submodal.
 *
 * El componente es no-controlado respecto al input (gestiona su propio estado
 * interno). El padre solo recibe `onSelect(person)` cuando se selecciona.
 */
export function PersonSearchWithCreate({
  label,
  placeholder,
  initialDisplayValue,
  initialSelectedId,
  required,
  onSelect,
}: PersonSearchWithCreateProps) {
  const { t } = useTranslation('people');

  const [search, setSearch] = useState(initialDisplayValue ?? '');
  const [results, setResults] = useState<PersonListItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonListItem | null>(
    initialSelectedId ? { id: initialSelectedId, identity_number: '', first_name: '', first_surname: '' } : null,
  );
  const [showPersonForm, setShowPersonForm] = useState(false);

  useEffect(() => {
    if (search.length < 3) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(async () => {
      const r = await http.get<{ data: PersonListItem[] }>('/people', { params: { search, per_page: 10 } });
      setResults(r.data.data);
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ¿La búsqueda actual es un CI válido (11 dígitos) sin resultados?
  const isCISearchWithoutResults = searched && results.length === 0 && isValidCubanCI(search.trim());

  const handleSelect = (person: PersonListItem) => {
    setSelectedPerson(person);
    setSearch(`${person.first_name} ${person.first_surname} (${person.identity_number})`);
    setResults([]);
    setSearched(false);
    setShowResults(false);
    onSelect(person);
  };

  const handleCreated = (person: Person) => {
    const personSummary: PersonListItem = {
      id: person.id ?? 0,
      identity_number: person.identity_number ?? '',
      first_name: person.first_name ?? '',
      first_surname: person.first_surname ?? '',
    };
    setSelectedPerson(personSummary);
    setSearch(`${personSummary.first_name} ${personSummary.first_surname} (${personSummary.identity_number})`.trim());
    setResults([]);
    setSearched(false);
    setShowResults(false);
    setShowPersonForm(false);
    onSelect(personSummary);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      <Input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => { setSearch(e.target.value); setShowResults(true); setSelectedPerson(null); setSearched(false); }}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
      />
      {/* Dropdown de resultados */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-modal max-h-48 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(p)}
            >
              <span className="font-mono text-xs">{p.identity_number}</span> — {p.first_name} {p.first_surname}
            </button>
          ))}
        </div>
      )}
      {/* No se encontró persona con el CI proporcionado — ofrecer registro */}
      {showResults && isCISearchWithoutResults && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-modal p-3 space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <SearchIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-muted-foreground">
              {t('search.not_found', { ci: search.trim() })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPersonForm(true)}
            className="w-full"
          >
            <UserPlus className="w-4 h-4" />
            {t('search.register_new', { ci: search.trim() })}
          </Button>
        </div>
      )}
      {/* Indicador visual de persona seleccionada */}
      {selectedPerson && !showResults && (
        <p className="text-xs text-success mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {t('search.selected')}
        </p>
      )}
      {/* Modal-sobre-modal para registrar nueva persona */}
      {showPersonForm && (
        <PersonFormModal
          initialIdentityNumber={search.trim()}
          onCreated={handleCreated}
          onClose={() => setShowPersonForm(false)}
        />
      )}
    </div>
  );
}
