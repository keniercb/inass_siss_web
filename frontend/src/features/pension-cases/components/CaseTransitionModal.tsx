import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Gavel, CheckCircle2, XCircle, FileText, FileX } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useCaseTransition } from '../api/mutations';
import { CASE_STATUS_META, TRANSITION_MATRIX, type CaseStatus, type TransitionRule } from '../schemas/pension-case.schema';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { DatePickerField } from '@/components/ui/DatePickerField';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import { http } from '@/lib/http';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface CaseTransitionModalProps {
  caseId: number | string;
  currentStatus: CaseStatus;
  /** Tipo de pensión del expediente — la declaración de fallecimiento solo
   *  procede desde la rama NO fallecimiento (el backend rechaza el resto 422;
   *  ocultarla aquí evita ofrecer una transición imposible). */
  pensionTypeId?: number | null;
  onClose: () => void;
}

interface LegalBasisItem { id: number; number: string; issue_date: string; reference?: string | null; status?: string | null; }
interface LegalBasisListResponse { data: LegalBasisItem[]; }
interface PensionTypeItem { id: number; retirement_type?: 'edad' | 'invalidez' | 'fallecimiento' | null; }
interface CatalogListResponse { data: PensionTypeItem[]; }

const STATUS_ICONS: Record<CaseStatus, React.ComponentType<{ className?: string }>> = {
  submitted: FileText,
  under_review: Gavel,
  approved: CheckCircle2,
  rejected: XCircle,
  deceased: FileX,
};

/**
 * Modal para ejecutar una transición de estado del expediente.
 *
 * Sigue el patrón declarativo del backend (POST /pension-cases/{id}/transitions
 * con { to, note, legal_basis_id, force }):
 *  - Lista las transiciones LEGALES según la matriz de la sección 2.4 desde el estado actual.
 *  - Filtra las que el usuario no tiene permiso (cases.review/approve/reject/reopen).
 *  - Oculta la declaración de fallecimiento cuando el expediente ya es de la rama
 *    fallecimiento (sobrevivencia) — el backend la rechaza con 422.
 *  - Muestra evidencia exigida (nota ≥ 10 car., base legal vigente, force si derogada,
 *    bloque de defunción en la declaración de fallecimiento).
 *  - Botón confirmar dispara la mutation.
 *
 * La pre-validación de nota ≥ 10 caracteres se hace en el schema (UX);
 * el backend valida autoritativamente en 422.
 */
export function CaseTransitionModal({ caseId, currentStatus, pensionTypeId, onClose }: CaseTransitionModalProps) {
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const mutation = useCaseTransition(caseId);

  // Rama del tipo de pensión — la declaración de fallecimiento solo procede
  // desde un expediente de rama NO fallecimiento.
  const { data: pensionTypesData } = useQuery({
    queryKey: ['catalogs', 'pension-types', 'all'],
    queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/pension-types', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
  });
  const isFallecimientoBranch = useMemo(
    () => pensionTypesData?.data.find((pt) => pt.id === pensionTypeId)?.retirement_type === 'fallecimiento',
    [pensionTypesData, pensionTypeId],
  );

  // Transiciones legales desde el estado actual
  const availableTransitions = useMemo<TransitionRule[]>(() => {
    return (TRANSITION_MATRIX[currentStatus] ?? [])
      .filter((rule) => rule.to !== 'deceased' || !isFallecimientoBranch)
      .filter((rule) => can(rule.permission));
  }, [currentStatus, isFallecimientoBranch, can]);

  const [selectedTo, setSelectedTo] = useState<CaseStatus | null>(
    availableTransitions.length > 0 ? availableTransitions[0]!.to : null,
  );
  const [note, setNote] = useState('');
  const [legalBasisId, setLegalBasisId] = useState<number>(0);
  const [force, setForce] = useState(false);
  // Task 73/Bloque B-3: pago inicial — obligatorio en aprobación de NUEVO expediente
  // (422 pension_cases.initial_payment_required si falta). Pareja todo-o-nada con
  // initial_payment_description. El pago inicial nace con amount = cuantía + monto (D-7311).
  // Re-aprobación tras reapertura: opcional. Otras transiciones: prohibido (no se envía).
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('');
  const [initialPaymentDescription, setInitialPaymentDescription] = useState<string>('');
  // Bloque de defunción (declaración de fallecimiento): las 5 claves son
  // todo-o-nada con to=deceased — obligatorias ahí, prohibidas en las demás.
  // Estados inicializados en null/vacío para no preseleccionar nada.
  const [deathDiseaseId, setDeathDiseaseId] = useState<number | null>(null);
  const [deathDiseaseOrigin, setDeathDiseaseOrigin] = useState<'comun' | 'profesional' | 'accidente_trabajo' | 'accidente_trayecto' | null>(null);
  const [deathDate, setDeathDate] = useState<string>('');
  const [deathCertificate, setDeathCertificate] = useState<string>('');
  const [deathCertificateDate, setDeathCertificateDate] = useState<string>('');

  // Cargar bases legales para el selector (solo si la transición seleccionada las exige)
  const needsLegalBasis = useMemo(() => {
    if (!selectedTo) return false;
    const rule = availableTransitions.find((r) => r.to === selectedTo);
    return rule?.legalBasisRequired ?? false;
  }, [selectedTo, availableTransitions]);

  const { data: legalBasesData } = useQuery({
    queryKey: ['legal-bases', 'all'],
    queryFn: async () => { const r = await http.get<LegalBasisListResponse>('/legal-bases', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
    enabled: needsLegalBasis,
  });
  const legalBases = legalBasesData?.data ?? [];

  const selectedRule = availableTransitions.find((r) => r.to === selectedTo) ?? null;
  const noteRequired = selectedRule?.noteRequired ?? false;
  const noteTooShort = note.length > 0 && note.length < 10;
  const noteMissing = noteRequired && note.length === 0;
  // El pago inicial solo aplica en aprobación. La regla todo-o-nada exige ambos campos.
  const isApproval = selectedTo === 'approved';
  const initialPaymentMissing = isApproval && (initialPaymentAmount === '' || initialPaymentDescription.trim() === '');
  // Declaración de fallecimiento: las 5 claves del bloque de defunción son
  // obligatorias (todo-o-nada). El backend valida fechas y coherencia con 422.
  const isDeceased = selectedTo === 'deceased';
  const deathBlockMissing = isDeceased && (
    deathDiseaseId == null || deathDiseaseOrigin == null || !deathDate
    || !deathCertificate.trim() || !deathCertificateDate
  );
  const canSubmit = selectedTo != null
    && (!noteRequired || (note.length >= 10))
    && (!needsLegalBasis || legalBasisId !== 0)
    && !noteTooShort
    && !initialPaymentMissing
    && !deathBlockMissing
    && !mutation.isPending;

  const handleSubmit = async () => {
    if (!selectedTo) return;
    const payload: Record<string, unknown> = { to: selectedTo };
    if (note) payload.note = note;
    if (needsLegalBasis && legalBasisId) payload.legal_basis_id = legalBasisId;
    if (needsLegalBasis && force) payload.force = true;
    // Task 73/Bloque B-3: pago inicial solo en aprobación. Pareja todo-o-nada.
    if (isApproval && initialPaymentAmount !== '' && initialPaymentDescription.trim() !== '') {
      payload.initial_payment_amount = initialPaymentAmount;
      payload.initial_payment_description = initialPaymentDescription.trim();
    }
    // Bloque de defunción: solo con to=deceased (prohibido en las demás).
    // El switch de forzar jubilación por edad JAMÁS viaja — el sistema lo escribe.
    if (isDeceased) {
      payload.disease_id = deathDiseaseId;
      payload.disease_origin = deathDiseaseOrigin;
      payload.death_date = deathDate || null;
      payload.death_certificate = deathCertificate.trim() || null;
      payload.death_certificate_date = deathCertificateDate || null;
    }
    try {
      await mutation.mutateAsync(payload as never);
      onClose();
      // Refresca la página de detalle (la query del caso se invalida automáticamente)
      navigate(`/expedientes/${caseId}`);
    } catch {
      /* toast handled by mutation.onError */
    }
  };

  return (
    <Dialog open onClose={onClose} title={t('transition.title')} size="md">
      <div className="space-y-4">
        {/* Estado actual */}
        <div className="bg-muted/50 rounded-md p-3 flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{t('transition.current')}</span>
          <span className={cn('badge', CASE_STATUS_META[currentStatus]?.badgeClass)}>{t(`list.status.${currentStatus}`)}</span>
        </div>

        {/* Transiciones disponibles */}
        {availableTransitions.length === 0 ? (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{t('transition.no_available')}</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-2">{t('transition.select_target')}</label>
            <div className="grid gap-2">
              {availableTransitions.map((rule) => {
                const Icon = STATUS_ICONS[rule.to];
                const isSelected = selectedTo === rule.to;
                return (
                  <button
                    key={`${currentStatus}-${rule.to}`}
                    type="button"
                    onClick={() => {
                      setSelectedTo(rule.to); setNote(''); setLegalBasisId(0); setForce(false); setInitialPaymentAmount(''); setInitialPaymentDescription('');
                      setDeathDiseaseId(null); setDeathDiseaseOrigin(null); setDeathDate(''); setDeathCertificate(''); setDeathCertificateDate('');
                    }}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-md border text-left transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-white hover:bg-muted/30',
                    )}
                  >
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0 text-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{t(rule.labelKey)}</span>
                        <span className="text-xs text-muted-foreground">· {t(`list.status.${rule.to}`)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rule.noteRequired && t('transition.requires_note')}
                        {rule.noteRequired && rule.legalBasisRequired && ' · '}
                        {rule.legalBasisRequired && t('transition.requires_legal_basis')}
                        {rule.deathBlockRequired && t('transition.requires_death_block')}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Evidencia exigida */}
        {selectedRule && (noteRequired || needsLegalBasis || isApproval || isDeceased) && (
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('transition.evidence_section')}</h3>

            {(noteRequired || isDeceased) && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('transition.note_label')}{noteRequired ? ' *' : ''}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {noteRequired ? t('transition.note_hint') : t('transition.note_optional_hint')}
                  </span>
                </label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('transition.note_placeholder')}
                  maxLength={2000}
                />
                {noteTooShort && (
                  <p className="text-xs text-destructive mt-1">{t('transition.note_too_short')}</p>
                )}
                {noteMissing && (
                  <p className="text-xs text-destructive mt-1">{t('transition.note_required_msg')}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 text-right">{note.length}/2000</p>
              </div>
            )}

            {needsLegalBasis && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('transition.legal_basis_label')} *</label>
                <SearchSelect
                  value={legalBasisId || undefined}
                  onChange={(v) => setLegalBasisId(Number(v) || 0)}
                  options={legalBases.map((lb) => ({
                    value: lb.id,
                    label: `${lb.number} · ${formatDate(lb.issue_date)}${lb.reference ? ` · ${lb.reference}` : ''}`,
                  }))}
                  placeholder={tc('actions.select')}
                  required
                />
                {/* Force flag: solo si la regla lo permite */}
                {selectedRule.forceAllowed && legalBasisId !== 0 && (
                  <label className="flex items-start gap-2 mt-2 p-2 rounded-md bg-amber-50 border border-amber-200">
                    <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="w-4 h-4 mt-0.5" />
                    <span className="text-xs text-amber-900">
                      <strong>{t('transition.force_label')}</strong>
                      <span className="block">{t('transition.force_help')}</span>
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Task 73/Bloque B-3: pago inicial — obligatorio en aprobación de nuevo expediente.
                El pago inicial nace con amount = cuantía + monto introducido (D-7311, literal CONFIRMADO).
                Pareja todo-o-nada: ambos campos o ninguno. En re-aprobación tras reapertura es opcional. */}
            {isApproval && (
              <div className="space-y-3 p-3 rounded-md bg-muted/30 border border-border">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('transition.initial_payment_amount')} *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="800.50"
                    value={initialPaymentAmount}
                    onChange={(e) => setInitialPaymentAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('transition.initial_payment_amount_help')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('transition.initial_payment_description')} *</label>
                  <Input
                    type="text"
                    maxLength={255}
                    placeholder={t('transition.initial_payment_description_placeholder')}
                    value={initialPaymentDescription}
                    onChange={(e) => setInitialPaymentDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{initialPaymentDescription.length}/255</p>
                </div>
                {initialPaymentMissing && (
                  <p className="text-xs text-destructive">{t('transition.initial_payment_required')}</p>
                )}
              </div>
            )}

            {/* Declaración de fallecimiento — bloque de defunción (todo-o-nada,
                todas las claves obligatorias). El certificado de defunción ES la
                evidencia: la nota es opcional. Las fechas y la coherencia con el
                nacimiento las valida el backend (422 con detalle). */}
            {isDeceased && (
              <div className="space-y-3 p-3 rounded-md bg-muted/30 border border-border">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t('form.death_block_title')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('transition.death_block_help')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <CatalogSearchSelect
                    type="diseases"
                    label={t('form.death_cause')}
                    placeholder={tc('actions.search') + '…'}
                    required
                    onSelect={(item) => setDeathDiseaseId(item.id)}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.death_origin_type')} *</label>
                    <SearchSelect
                      value={deathDiseaseOrigin ?? undefined}
                      onChange={(v) => setDeathDiseaseOrigin(v as 'comun' | 'profesional' | 'accidente_trabajo' | 'accidente_trayecto')}
                      options={[
                        { value: 'comun', label: t('form.disease_origin_comun') },
                        { value: 'profesional', label: t('form.disease_origin_profesional') },
                        { value: 'accidente_trabajo', label: t('form.disease_origin_accidente_trabajo') },
                        { value: 'accidente_trayecto', label: t('form.disease_origin_accidente_trayecto') },
                      ]}
                      placeholder={tc('actions.select')}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.death_date')} *</label>
                    <DatePickerField value={deathDate} onChange={setDeathDate} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('form.death_certificate_date')} *</label>
                    <DatePickerField value={deathCertificateDate} onChange={setDeathCertificateDate} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('form.death_certificate')} *</label>
                  <Input
                    type="text"
                    maxLength={100}
                    placeholder="CERT-2026-001182"
                    autoComplete="off"
                    value={deathCertificate}
                    onChange={(e) => setDeathCertificate(e.target.value)}
                  />
                </div>
                {deathBlockMissing && (
                  <p className="text-xs text-destructive">{t('transition.death_block_required')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {mutation.isPending ? tc('status.loading') + '…' : t('transition.confirm')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
