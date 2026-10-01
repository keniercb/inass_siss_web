import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search as SearchIcon, CheckCircle2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { http } from '@/lib/http';

interface CatalogItem {
  id: number;
  code?: string | null;
  name: string;
  description?: string | null;
}

interface CatalogListResponse {
  data: CatalogItem[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

interface CatalogSearchSelectProps {
  /** Tipo de catálogo (ej. 'positions', 'occupational-categories') — se usa en /catalogs/{type} */
  type: string;
  /** Etiqueta visible del campo */
  label: string;
  /** Placeholder del input */
  placeholder?: string;
  /** Valor inicial del input (caso edición: "Director General") */
  initialDisplayValue?: string;
  /** ID inicial seleccionado (para mostrar indicador ✓) */
  initialSelectedId?: number | null;
  /** Si el campo es obligatorio */
  required?: boolean;
  /** Callback cuando se selecciona un item (existente o recién creado) */
  onSelect: (item: CatalogItem) => void;
  /** Si permitir crear nuevos items cuando no se encuentran (default: true) */
  allowCreate?: boolean;
}

/**
 * Componente reutilizable de búsqueda de catálogo con opción "crear nuevo"
 * cuando no se encuentra el item buscado.
 *
 * Flujo UX (igual que PersonSearchWithCreate pero para catálogos):
 *  1. Usuario escribe texto (mínimo 1 carácter).
 *  2. GET /catalogs/{type}?search=...&per_page=10 con debounce 300ms.
 *  3. Si hay resultados: dropdown con todas las coincidencias.
 *  4. Si NO hay resultados Y allowCreate=true: botón "Crear nuevo".
 *  5. Al hacer clic: abre un diálogo simple (code + name) que POSTea a
 *     /catalogs/{type}. Tras crear, llama onSelect(item) y cierra el diálogo.
 */
export function CatalogSearchSelect({
  type,
  label,
  placeholder,
  initialDisplayValue,
  initialSelectedId,
  required,
  onSelect,
  allowCreate = true,
}: CatalogSearchSelectProps) {
  const { t } = useTranslation('people');
  const { t: tc } = useTranslation('common');
  const toast = useToast();

  const [search, setSearch] = useState(initialDisplayValue ?? '');
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(
    initialSelectedId ? { id: initialSelectedId, name: initialDisplayValue ?? '' } : null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Estado del diálogo de creación
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (search.length < 1) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(async () => {
      const r = await http.get<CatalogListResponse>(`/catalogs/${type}`, { params: { search: search.trim(), per_page: 10 } });
      setResults(r.data.data ?? []);
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, type]);

  const isSearchWithoutResults = searched && results.length === 0 && search.trim().length > 0;

  const handleSelect = (item: CatalogItem) => {
    setSelectedItem(item);
    setSearch(item.name);
    setResults([]);
    setSearched(false);
    setShowResults(false);
    onSelect(item);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await http.post<{ data: CatalogItem }>(`/catalogs/${type}`, {
        code: newCode.trim() || undefined,
        name: newName.trim(),
      });
      const created = r.data.data;
      setSelectedItem(created);
      setSearch(created.name);
      setResults([]);
      setSearched(false);
      setShowResults(false);
      setShowCreateForm(false);
      setNewCode('');
      setNewName('');
      onSelect(created);
      toast.success(tc('status.success'));
    } catch (err) {
      const ae = err as import('axios').AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(tc('errors.validation'), allMessages.join(' · '));
      } else {
        toast.error(tc('errors.server'));
      }
    } finally {
      setCreating(false);
    }
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
        onChange={(e) => { setSearch(e.target.value); setShowResults(true); setSelectedItem(null); setSearched(false); }}
        onFocus={() => setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
      />
      {/* Dropdown de resultados */}
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-md shadow-modal max-h-48 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-0"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
            >
              {item.code && <span className="font-mono text-xs text-muted-foreground">{item.code}</span>} {item.name}
            </button>
          ))}
        </div>
      )}
      {/* No se encontró — ofrecer crear nuevo */}
      {showResults && isSearchWithoutResults && allowCreate && (
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
            onClick={() => { setShowCreateForm(true); setShowResults(false); setNewName(search.trim()); }}
            className="w-full"
          >
            <Plus className="w-4 h-4" />
            {t('search.register_new', { ci: search.trim() })}
          </Button>
        </div>
      )}
      {/* Indicador visual de item seleccionado */}
      {selectedItem && !showResults && (
        <p className="text-xs text-success mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {selectedItem.name}
        </p>
      )}
      {/* Diálogo para crear nuevo item de catálogo */}
      {showCreateForm && (
        <Dialog
          open
          onClose={() => setShowCreateForm(false)}
          title={label}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Código</label>
              <Input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="ABC"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del item"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button
                type="button"
                disabled={!newName.trim() || creating}
                onClick={handleCreate}
              >
                {creating ? tc('status.loading') + '…' : tc('actions.save')}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
