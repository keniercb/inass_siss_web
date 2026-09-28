import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  onChange: (page: number, perPage?: number) => void;
  perPageOptions?: number[];
}

export function Pagination({
  currentPage,
  lastPage,
  perPage,
  total,
  onChange,
  perPageOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const { t } = useTranslation('common');

  // Calcular rango de items mostrados
  const start = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  // Generar páginas a mostrar (máximo 7: primera, actual ±2, última)
  const pages = getPageNumbers(currentPage, lastPage);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
      <div className="text-xs text-muted-foreground">
        {t('pagination.showing')}{' '}
        <span className="font-medium text-foreground">{start}-{end}</span>{' '}
        {t('pagination.of')}{' '}
        <span className="font-medium text-foreground">{total}</span>{' '}
        {t('pagination.results')}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={t('pagination.previous')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onChange(page)}
              className="min-w-[2rem]"
            >
              {page}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => onChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          aria-label={t('pagination.next')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <select
        value={perPage}
        onChange={(e) => onChange(1, Number(e.target.value))}
        className="px-2 py-1 text-xs rounded border border-input bg-white"
        aria-label={t('pagination.per_page')}
      >
        {perPageOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt} {t('pagination.per_page')}
          </option>
        ))}
      </select>
    </div>
  );
}

function getPageNumbers(current: number, last: number): Array<number | 'ellipsis'> {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];

  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);

  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < last - 1) pages.push('ellipsis');

  pages.push(last);
  return pages;
}
