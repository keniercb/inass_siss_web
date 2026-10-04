import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import { useCallback } from 'react';
import 'react-datepicker/dist/react-datepicker.css';

// Registrar locale español una sola vez
registerLocale('es', es);

interface DatePickerFieldProps {
  id?: string;
  value: string; // formato YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
}

/**
 * Campo de fecha reutilizable basado en react-datepicker.
 * Convierte entre string YYYY-MM-DD (formato del backend) y Date.
 *
 * El calendario soporta navegación por meses (botones < >) y por años
 * (click en el header del mes abre el selector de año, con navegación
 * por décadas mediante los botones < > del selector de año).
 */
export function DatePickerField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  maxDate,
  minDate,
  className,
}: DatePickerFieldProps) {
  const selected = value ? new Date(value + 'T00:00:00') : null;

  const handleChange = useCallback((date: Date | null) => {
    if (date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      onChange(`${y}-${m}-${d}`);
    } else {
      onChange('');
    }
  }, [onChange]);

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={handleChange}
      dateFormat="yyyy-MM-dd"
      locale="es"
      placeholderText={placeholder}
      disabled={disabled}
      maxDate={maxDate}
      minDate={minDate}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      scrollableYearDropdown
      yearDropdownItemNumber={50}
      isClearable={!disabled}
      className={className ?? `flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-destructive' : 'border-input'}`}
      wrapperClassName="w-full"
    />
  );
}
