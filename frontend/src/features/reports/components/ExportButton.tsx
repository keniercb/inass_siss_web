import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { useCreateExportRun } from '../api/mutations';
import type { CreateExportRunInput } from '../api/schemas';

type ReportType = CreateExportRunInput['report'];
type ExportFormat = CreateExportRunInput['format'];

const REPORT_OPTIONS: { value: ReportType; labelKey: string }[] = [
  { value: 'cases', labelKey: 'exports.report_types.cases' },
  { value: 'pensioners', labelKey: 'exports.report_types.pensioners' },
  { value: 'bank-controls', labelKey: 'exports.report_types.bank-controls' },
  { value: 'dashboard', labelKey: 'exports.report_types.dashboard' },
  { value: 'case-listing', labelKey: 'exports.report_types.case-listing' },
];

const FORMAT_OPTIONS: { value: ExportFormat; labelKey: string }[] = [
  { value: 'xlsx', labelKey: 'common.format_xlsx' },
  { value: 'csv', labelKey: 'common.format_csv' },
];

const PENSIONER_STATUS = ['active', 'suspended', 'terminated'] as const;
const CASE_LISTING_STATUS = ['submitted', 'under_review', 'approved', 'rejected', 'deceased'] as const;

interface ExportButtonProps {
  /** Reporte preseleccionado (no se puede cambiar si se pasa `lockReport`). */
  defaultReport?: ReportType;
  /** Filtros iniciales derivados del contexto (ej. los filtros activos de la página actual). */
  defaultFilters?: Partial<CreateExportRunInput>;
  /** Si true, el reporte queda fijo y solo se elige formato + filtros. */
  lockReport?: boolean;
  /** Etiqueta del botón; por defecto "Exportar". */
  label?: string;
  /** Tamaño del botón. */
  size?: 'sm' | 'md';
}

/**
 * Botón + modal para solicitar una exportación.
 *
 * Los campos condicionales dependen del `report` elegido:
 *   - cases / dashboard: from, to, office_id
 *   - pensioners: status (active/suspended/terminated)
 *   - bank-controls: year, month
 *   - case-listing: q, number, applicant_person_id, parent_case_id,
 *                   requested_from, requested_to, status (estados de expediente)
 *
 * La validación de pares coherentes la hace el backend (422). El frontend no
 * implementa lógica de negocio: solo arma el payload y lo envía.
 */
export function ExportButton({
  defaultReport = 'cases',
  defaultFilters = {},
  lockReport = true,
  label,
  size = 'sm',
}: ExportButtonProps) {
  const { t } = useTranslation('reports');
  const { t: tc } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const mutation = useCreateExportRun();

  const [report, setReport] = useState<ReportType>(defaultReport);
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  // Campos compartidos
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [officeId, setOfficeId] = useState<number>(0);
  // pensioners / case-listing
  const [status, setStatus] = useState<string>('');
  // bank-controls
  const [year, setYear] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  // case-listing
  const [q, setQ] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [applicantPersonId, setApplicantPersonId] = useState<string>('');
  const [parentCaseId, setParentCaseId] = useState<string>('');
  const [requestedFrom, setRequestedFrom] = useState<string>('');
  const [requestedTo, setRequestedTo] = useState<string>('');

  // Reset/formatear campos cuando se abre el modal o cambia el reporte
  useEffect(() => {
    if (!open) return;
    setReport(defaultReport);
    setFormat('xlsx');
    setFrom(defaultFilters.from ?? '');
    setTo(defaultFilters.to ?? '');
    setOfficeId(defaultFilters.office_id ?? 0);
    setStatus(defaultFilters.status ?? '');
    setYear(defaultFilters.year ? String(defaultFilters.year) : '');
    setMonth(defaultFilters.month ? String(defaultFilters.month) : '');
    setQ('');
    setNumber('');
    setApplicantPersonId('');
    setParentCaseId('');
    setRequestedFrom('');
    setRequestedTo('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cargar oficinas para el SearchSelect
  const { data: officesData } = useQuery({
    queryKey: ['organizations', 'offices', 'all'],
    queryFn: async () => {
      const r = await http.get<{ data: { id: number; municipality?: string; address?: string }[] }>('/offices', { params: { per_page: 100 } });
      return r.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: open && (report === 'cases' || report === 'dashboard'),
  });
  const officeOptions = (officesData?.data ?? []).map((o) => ({
    value: o.id,
    label: `${o.municipality ?? '—'} · ${o.address ?? '—'}`,
    secondary: `#${o.id}`,
  }));

  function buildPayload(): CreateExportRunInput {
    const payload: CreateExportRunInput = { report, format };
    if (report === 'cases' || report === 'dashboard') {
      if (from) payload.from = from;
      if (to) payload.to = to;
      if (officeId) payload.office_id = officeId;
    }
    if (report === 'pensioners') {
      if (status) payload.status = status;
    }
    if (report === 'bank-controls') {
      if (year) payload.year = Number(year);
      if (month) payload.month = Number(month);
    }
    if (report === 'case-listing') {
      if (q) payload.q = q;
      if (number) payload.number = number;
      if (applicantPersonId) payload.applicant_person_id = Number(applicantPersonId);
      if (parentCaseId) payload.parent_case_id = Number(parentCaseId);
      if (requestedFrom) payload.requested_from = requestedFrom;
      if (requestedTo) payload.requested_to = requestedTo;
      if (status) payload.status = status;
    }
    return payload;
  }

  async function handleSubmit() {
    try {
      await mutation.mutateAsync(buildPayload());
      setOpen(false);
    } catch {
      // el toast lo maneja la mutación
    }
  }

  const buttonLabel = label ?? t('common.export');

  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>
        <Download className="w-4 h-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title={t('export_create.title')} size="lg">
        <div className="space-y-4">
          {/* Reporte + formato */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('export_create.report')}</label>
              <SearchSelect
                value={report}
                onChange={(v) => !lockReport && setReport(v as ReportType)}
                options={REPORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                placeholder={tc('actions.select')}
                required
                disabled={lockReport}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('export_create.format')}</label>
              <SearchSelect
                value={format}
                onChange={(v) => setFormat(v as ExportFormat)}
                options={FORMAT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                placeholder={tc('actions.select')}
                required
              />
            </div>
          </div>

          {/* Filtros condicionales por reporte */}
          {(report === 'cases' || report === 'dashboard') && (
            <fieldset className="border border-border rounded-md p-4 space-y-3">
              <legend className="text-xs font-medium text-muted-foreground px-2">
                {report === 'cases' ? t('export_create.filters_cases') : t('export_create.filters_dashboard')}
              </legend>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('common.from')}</label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('common.to')}</label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('common.office')}</label>
                  <SearchSelect value={officeId || undefined} onChange={(v) => setOfficeId(Number(v) || 0)} options={officeOptions} placeholder={t('common.office_all')} />
                </div>
              </div>
            </fieldset>
          )}

          {report === 'pensioners' && (
            <fieldset className="border border-border rounded-md p-4 space-y-3">
              <legend className="text-xs font-medium text-muted-foreground px-2">{t('export_create.filters_pensioners')}</legend>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('common.status')}</label>
                <SearchSelect
                  value={status || undefined}
                  onChange={(v) => setStatus(String(v ?? ''))}
                  options={PENSIONER_STATUS.map((s) => ({ value: s, label: t(`export_create.status_${s}`) }))}
                  placeholder={t('common.status_all')}
                />
              </div>
            </fieldset>
          )}

          {report === 'bank-controls' && (
            <fieldset className="border border-border rounded-md p-4 space-y-3">
              <legend className="text-xs font-medium text-muted-foreground px-2">{t('export_create.filters_bank_controls')}</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('common.year')}</label>
                  <Input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('common.month')}</label>
                  <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="1-12" autoComplete="off" />
                </div>
              </div>
            </fieldset>
          )}

          {report === 'case-listing' && (
            <fieldset className="border border-border rounded-md p-4 space-y-3">
              <legend className="text-xs font-medium text-muted-foreground px-2">{t('export_create.filters_case_listing')}</legend>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('export_create.q')}</label>
                  <Input type="text" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('export_create.number')}</label>
                  <Input type="text" value={number} onChange={(e) => setNumber(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('export_create.applicant_person_id')}</label>
                  <Input type="number" value={applicantPersonId} onChange={(e) => setApplicantPersonId(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('export_create.parent_case_id')}</label>
                  <Input type="number" value={parentCaseId} onChange={(e) => setParentCaseId(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('common.status')}</label>
                  <SearchSelect
                    value={status || undefined}
                    onChange={(v) => setStatus(String(v ?? ''))}
                    options={CASE_LISTING_STATUS.map((s) => ({ value: s, label: t(`export_create.status_${s}`) }))}
                    placeholder={t('common.status_all')}
                  />
                </div>
                <div />
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('export_create.requested_from')}</label>
                  <Input type="date" value={requestedFrom} onChange={(e) => setRequestedFrom(e.target.value)} autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('export_create.requested_to')}</label>
                  <Input type="date" value={requestedTo} onChange={(e) => setRequestedTo(e.target.value)} autoComplete="off" />
                </div>
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>{tc('actions.cancel')}</Button>
            <Button disabled={mutation.isPending} onClick={handleSubmit}>
              {mutation.isPending ? tc('status.loading') + '…' : t('export_create.confirm')}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
