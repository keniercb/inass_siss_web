import { useState, useMemo, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

export interface SearchSelectOption {
  value: string | number;
  label: string;
  /** Si viene, se muestra como secundario bajo el label (p. ej. code) */
  secondary?: string;
}

interface SearchSelectProps {
  /** Valor seleccionado actual (string o number) */
  value: string | number | null | undefined;
  /** Callback cuando se selecciona una opción */
  onChange: (value: string | number | null) => void;
  /** Opciones estáticas (para listas pequeñas/medianas que no requieren búsqueda remota) */
  options?: SearchSelectOption[];
  /**
   * Carga opciones de forma async con búsqueda (para listas largas que vienen del backend).
   * Si se provee, el componente entra en modo async y muestra un input de búsqueda.
   * Si no se provee, filtra las options estáticas localmente.
   */
  loadOptions?: (query: string) => Promise<SearchSelectOption[]>;
  /** Placeholder del input cuando está vacío */
  placeholder?: string;
  /** Texto a mostrar en el input cuando hay un valor seleccionado (modo edición) */
  initialDisplayValue?: string;
  /** Label visible arriba del campo */
  label?: string;
  /** Si el campo es obligatorio (muestra asterisco rojo) */
  required?: boolean;
  /** Deshabilita el campo */
  disabled?: boolean;
  /** Si hay error de validación (border rojo) */
  error?: boolean;
  /** Clase extra para el contenedor */
  className?: string;
  /** Ancho completo del wrapper (default true) */
  fullWidth?: boolean;
  /** ID del input (para label htmlFor) */
  id?: string;
}

/**
 * SearchSelect — componente unificado de selección con búsqueda.
 *
 * Características:
 *  - Abre el dropdown al FOCUS (no solo al escribir) — muestra mínimo 5 opciones
 *  - El dropdown se renderiza vía React Portal en document.body, escapando
 *    cualquier contenedor con overflow (Dialog, cards, etc.) — esto evita el
 *    "overflow" reportado cuando el campo está dentro de un modal.
 *  - Posicionamiento dinámico con flip: si no cabe abajo, se abre arriba.
 *  - Búsqueda con debounce 300ms (modo async) o filtro local (modo estático)
 *  - Navegación por teclado: ↑↓ navega, Enter selecciona, Escape cierra
 *  - Accesible: aria-expanded, aria-activedescendant, focus trap
 *  - Vacío: muestra "Sin resultados" cuando no hay opciones
 *
 * Reemplaza al native <select> con UX consistente en todos los formularios.
 */
export function SearchSelect({
  value,
  onChange,
  options,
  loadOptions,
  placeholder,
  initialDisplayValue,
  label,
  required,
  disabled,
  error,
  className,
  fullWidth = true,
  id,
}: SearchSelectProps) {
  const isAsync = !!loadOptions;

  // Estado del input de búsqueda
  const [search, setSearch] = useState(initialDisplayValue ?? '');
  const [internalOptions, setInternalOptions] = useState<SearchSelectOption[]>(options ?? []);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, isAsync ? 300 : 0);

  // --- Posicionamiento del dropdown (portal en body) -----------------------
  // Calcula top/left/width según el rect del input, con flip arriba
  // si no cabe debajo dentro del viewport.
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const reposition = useCallback(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0;
    const margin = 8;
    const dropdownMaxH = 240; // max-h-60 = 15rem = 240px

    const spaceBelow = viewportH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUpward = spaceBelow < dropdownMaxH && spaceAbove > spaceBelow;

    const style: React.CSSProperties = {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      // z alto: por encima del Dialog (z-[10000]) y overlay
      zIndex: 10050,
      maxHeight: dropdownMaxH,
    };
    if (openUpward) {
      style.bottom = viewportH - rect.top + 4; // 4px de separación del input
    } else {
      style.top = rect.bottom + 4;
    }
    setDropdownStyle(style);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  // Repositionar al hacer scroll o resize en cualquier ancestro (capture phase)
  useEffect(() => {
    if (!open) return;
    const handler = () => reposition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, reposition]);

  // Sync options si se pasan estáticas
  useEffect(() => {
    if (!isAsync && options) {
      setInternalOptions(options);
    }
  }, [isAsync, options]);

  // Cargar opciones async cuando cambia el search debounced
  useEffect(() => {
    if (!isAsync || !loadOptions) return;
    if (!open) return; // Solo carga cuando el dropdown está abierto
    let cancelled = false;
    setLoading(true);
    loadOptions(debouncedSearch.trim())
      .then((opts) => {
        if (!cancelled) {
          setInternalOptions(opts);
          setActiveIndex(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedSearch, isAsync, loadOptions, open]);

  // Filtrado local para modo estático
  const filteredOptions = useMemo(() => {
    if (isAsync) return internalOptions;
    if (!search.trim()) return internalOptions;
    const q = search.toLowerCase();
    return internalOptions.filter((o) =>
      o.label.toLowerCase().includes(q) || String(o.value).toLowerCase().includes(q) || o.secondary?.toLowerCase().includes(q)
    );
  }, [isAsync, internalOptions, search]);

  // Reset del search cuando se cierra el dropdown
  useEffect(() => {
    if (!open) {
      // Restaurar el displayValue si hay valor seleccionado
      const selected = (options ?? internalOptions).find((o) => String(o.value) === String(value));
      setSearch(selected?.label ?? initialDisplayValue ?? '');
      setActiveIndex(0);
    }
  }, [open, value, options, internalOptions, initialDisplayValue]);

  // Click fuera para cerrar (considera input Y dropdown portalizado)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (option: SearchSelectOption) => {
    onChange(option.value);
    setSearch(option.label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActiveIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const selected = filteredOptions[activeIndex];
      if (selected) handleSelect(selected);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const listboxId = `${id ?? 'search-select'}-listbox`;

  return (
    <div ref={containerRef} className={cn('relative', fullWidth && 'w-full', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {isAsync && <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />}
        <input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder ?? (isAsync ? 'Buscar…' : 'Seleccionar…')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={open && filteredOptions[activeIndex] ? `${id ?? 'search-select'}-opt-${activeIndex}` : undefined}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white pl-3 pr-9 py-2 text-sm transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isAsync && 'pl-9',
            error ? 'border-destructive' : 'border-input',
          )}
        />
        <ChevronDown
          className={cn(
            'w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-transform',
            open && 'rotate-180'
          )}
        />
      </div>

      {/* Dropdown renderizado vía Portal en document.body para escapar
          cualquier contenedor con overflow (Dialog, cards, etc.) */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          id={listboxId}
          role="listbox"
          style={dropdownStyle}
          className={cn(
            'bg-white border border-border rounded-md shadow-modal overflow-y-auto',
            'animate-modal-in',
          )}
        >
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Cargando…</div>
          )}
          {!loading && filteredOptions.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
          )}
          {!loading && filteredOptions.map((option, idx) => {
            const isSelected = String(option.value) === String(value);
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${option.value}-${idx}`}
                id={`${id ?? 'search-select'}-opt-${idx}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(option)}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 transition-colors',
                  isActive ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/50',
                  isSelected && 'font-medium text-primary'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {option.secondary && (
                      <span className="font-mono text-xs text-muted-foreground mr-2">{option.secondary}</span>
                    )}
                    <span>{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
