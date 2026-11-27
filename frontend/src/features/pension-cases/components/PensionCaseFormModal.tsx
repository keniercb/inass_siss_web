import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { Input } from '@/components/ui/Input';
import { useCreateCase, useUpdateCase } from '../api/mutations';
import { type CreateCaseInput, type UpdateCaseInput } from '../schemas/pension-case.schema';
import { PersonSearchWithCreate } from '@/features/people/components/PersonSearchWithCreate';
import { CatalogSearchSelect } from '@/features/catalogs/components/CatalogSearchSelect';
import type { components } from '@/types/api';

type PensionCase = components['schemas']['PensionCase'];
import { http } from '@/lib/http';
import { personFullName } from '@/lib/utils';
import { DatePickerField } from '@/components/ui/DatePickerField';

interface EntityListItem { id: number; code: string; name?: string; tax_id_number: string; }
interface EntityListResponse { data: EntityListItem[]; }

// Firma autorizada resumida (GET /authorized-signatures?entity_id=X&status=active)
interface AuthorizedSignatureItem {
  id: number;
  person: { id: number; identity_number: string; full_name?: string; first_name?: string; first_surname?: string };
  position: { id: number; name: string };
}
interface AuthorizedSignatureListResponse {
  data: AuthorizedSignatureItem[];
  meta: { current_page: number; per_page: number; total: number; last_page: number };
}

interface PensionCaseFormModalProps { pensionCase?: PensionCase; onClose: () => void; }

export function PensionCaseFormModal({ pensionCase, onClose }: PensionCaseFormModalProps) {
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const isEdit = !!pensionCase;
  const createMutation = useCreateCase();
  const updateMutation = useUpdateCase();

  // Entidades se cargan via SearchSelect.loadOptions al focus (no preload)

  // Estado local
  const [selectedPerson, setSelectedPerson] = useState<number | null>(pensionCase?.applicant_person_id ?? null);
  const [entityId, setEntityId] = useState(pensionCase?.employer_entity_id ?? 0);
  // "Solicitado por" — persona autorizada del centro de trabajo.
  // persona_por envía el ID de la persona seleccionada (no el nombre).
  const [requestedByPersonId, setRequestedByPersonId] = useState<number | null>(pensionCase?.filed_by_person_id ?? null);
  // Cargar firmas autorizadas activas del centro de trabajo seleccionado
  const { data: signaturesData, isLoading: isLoadingSignatures } = useQuery<AuthorizedSignatureListResponse>({
    queryKey: ['authorized-signatures', 'by-entity', String(entityId)],
    queryFn: async () => {
      const r = await http.get<AuthorizedSignatureListResponse>('/authorized-signatures', {
        params: { entity_id: entityId, status: 'active', per_page: 50 },
      });
      return r.data;
    },
    enabled: !!entityId,
    staleTime: 60_000,
  });
  const signatures = signaturesData?.data ?? [];

  // Resetear "solicitado por" cuando cambia el centro de trabajo
  useEffect(() => {
    setRequestedByPersonId(null);
  }, [entityId]);
  const [positionId, setPositionId] = useState(pensionCase?.position_id ?? 0);
  const [occCatId, setOccCatId] = useState(pensionCase?.occupational_category_id ?? 0);
  const [eduId, setEduId] = useState(pensionCase?.educational_level_id ?? 0);
  const [sciCatId, setSciCatId] = useState(pensionCase?.scientific_category_id ?? 0);
  const [lastSalary, setLastSalary] = useState(pensionCase?.last_salary ?? '');
  const [pensionTypeId, setPensionTypeId] = useState(pensionCase?.pension_type_id ?? 0);
  const [pensionRegimeId, setPensionRegimeId] = useState(pensionCase?.pension_regime_id ?? 0);
  const [belongsRebelArmy, setBelongsRebelArmy] = useState(pensionCase?.rebel_army_member ?? false);
  const [rebelArmyDate, setRebelArmyDate] = useState(pensionCase?.rebel_army_join_date ?? '');
  const [internationalist, setInternationalist] = useState(pensionCase?.internationalist ?? false);
  const [phone, setPhone] = useState(pensionCase?.phone ?? '');
  const [popularCouncil, setPopularCouncil] = useState(pensionCase?.popular_council ?? '');
  const [terminationDate, setTerminationDate] = useState(pensionCase?.termination_date ?? '');
  const [currentAddress, setCurrentAddress] = useState(pensionCase?.current_address ?? '');
  const [residenceProvinceId, setResidenceProvinceId] = useState(pensionCase?.residence_province_id ?? 0);
  const [residenceMunicipalityId, setResidenceMunicipalityId] = useState(pensionCase?.residence_municipality_id ?? 0);
  const [collectionAgencyTypeId, setCollectionAgencyTypeId] = useState(pensionCase?.collection_agency_type_id ?? 0);
  const [collectionAgencyId, setCollectionAgencyId] = useState(pensionCase?.collection_agency_id ?? 0);
  const [bankAccount, setBankAccount] = useState(pensionCase?.bank_account ?? '');
  const [requestedAt, setRequestedAt] = useState(pensionCase?.requested_at ?? '');
  // Declaración de imputabilidad de salarios ausentes.
  // Estado: null = sin selección (dropdown vacío en creación), 'unset' = sin declaración
  // (mapea a null en backend), 'true' = imputables, 'false' = no imputables.
  const [missingSalariesAttributable, setMissingSalariesAttributable] = useState<'unset' | 'true' | 'false' | null>(
    !isEdit ? null
      : pensionCase?.missing_salaries_attributable == null ? 'unset'
      : pensionCase.missing_salaries_attributable ? 'true' : 'false'
  );
  // Task 73/B-2: meses de salarios imputables — divisor EXPLÍCITO del SPM.
  // Solo declarable cuando missing_salaries_attributable === 'false' (no imputable).
  // null ⇒ divisor = N_eff × 12 (semántica histórica).
  const [imputableSalaryMonths, setImputableSalaryMonths] = useState<string>(
    pensionCase?.imputable_salary_months != null ? String(pensionCase.imputable_salary_months) : ''
  );
  // Reset del divisor cuando la declaración cambia a un estado donde no es declarable
  const handleAttributableChange = (next: 'unset' | 'true' | 'false') => {
    setMissingSalariesAttributable(next);
    if (next !== 'false') setImputableSalaryMonths('');
  };

  // Task 74/Bloque C: bloque de invalidez del expediente. Los 5 campos son obligatorios
  // cuando el pension_type.retirement_type === 'invalidez' y prohibidos en el resto (422, D-7408).
  // El frontend NO valida esa coherencia — la hace el backend. Solo captura y transmite.
  const [diseaseId, setDiseaseId] = useState<number | null>(pensionCase?.disease_id ?? null);
  const [diseaseOrigin, setDiseaseOrigin] = useState<'comun' | 'profesional' | 'accidente_trabajo' | 'accidente_trayecto' | ''>(
    pensionCase?.disease_origin ?? ''
  );
  const [requiresPersonalCare, setRequiresPersonalCare] = useState<boolean>(
    pensionCase?.requires_personal_care ?? false
  );
  const [temporaryDisability, setTemporaryDisability] = useState<boolean>(
    pensionCase?.temporary_disability ?? false
  );
  const [reAssessmentDate, setReAssessmentDate] = useState<string>(pensionCase?.re_assessment_date ?? '');

  // Bloque de defunción: obligatorio cuando retirement_type === 'fallecimiento'.
  const [deathDate, setDeathDate] = useState<string>(pensionCase?.death_date ?? '');
  const [deathCertificate, setDeathCertificate] = useState<string>(pensionCase?.death_certificate ?? '');
  const [deathCertificateDate, setDeathCertificateDate] = useState<string>(pensionCase?.death_certificate_date ?? '');
  const [forcedAgeRetirement, setForcedAgeRetirement] = useState<boolean>(pensionCase?.forced_age_retirement ?? false);

  // Para mostrar el bloque de invalidez necesitamos conocer el retirement_type del pension_type
  // seleccionado. El objeto PensionCase del OpenAPI no embebe pension_type (solo pension_type_id),
  // así que en AMBOS modos (create y edit) hacemos fetch del catálogo pension-types y lookup por id.
  // Mismo patrón que PensionCaseDetailPage con su useCatalog('pension-types').
  const { data: pensionTypesData } = useQuery<{ data: Array<{ id: number; retirement_type?: 'edad' | 'invalidez' | 'fallecimiento' }> }>({
    queryKey: ['catalogs', 'pension-types', 'all'],
    queryFn: async () => { const r = await http.get('/catalogs/pension-types', { params: { per_page: 100 } }); return r.data; },
    staleTime: 5 * 60 * 1000,
    enabled: !!pensionTypeId,
  });
  const selectedPensionTypeRetirement = pensionTypesData?.data.find((pt) => pt.id === pensionTypeId)?.retirement_type;
  const isInvalidezCase = selectedPensionTypeRetirement === 'invalidez';
  const isFallecimientoCase = selectedPensionTypeRetirement === 'fallecimiento';

  // Cargar provincias y municipios de residencia (cascading)
  const { data: provincesData } = useQuery({ queryKey: ['catalogs', 'provinces', 'all'], queryFn: async () => { const r = await http.get<{ data: { id: number; name: string }[] }>('/catalogs/provinces', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });
  const { data: residenceMunisData } = useQuery({ queryKey: ['municipalities', 'residence', { province_id: residenceProvinceId }], queryFn: async () => { if (!residenceProvinceId) return { data: [] }; const r = await http.get<{ data: { id: number; name: string }[] }>('/municipalities', { params: { per_page: 100, province_id: residenceProvinceId } }); return r.data; }, enabled: !!residenceProvinceId, staleTime: 60_000 });
  // Cargar agencias de cobro filtradas por tipo seleccionado
  const { data: collectionAgenciesData } = useQuery({ queryKey: ['agencies', 'collection', { agency_type_id: collectionAgencyTypeId }], queryFn: async () => { if (!collectionAgencyTypeId) return { data: [] }; const r = await http.get<{ data: { id: number; name: string }[] }>('/agencies', { params: { per_page: 100, agency_type_id: collectionAgencyTypeId } }); return r.data; }, enabled: !!collectionAgencyTypeId, staleTime: 60_000 });

  const onSubmit = async () => {
    if (!selectedPerson || !entityId || !positionId || !occCatId || !eduId || !sciCatId || !pensionTypeId || !pensionRegimeId || lastSalary === '') return;
    if (belongsRebelArmy && !rebelArmyDate) return;
    const input: CreateCaseInput = {
      applicant_person_id: selectedPerson,
      employer_entity_id: entityId,
      position_id: positionId,
      occupational_category_id: occCatId,
      educational_level_id: eduId,
      scientific_category_id: sciCatId,
      last_salary: Number(lastSalary) || 0,
      pension_type_id: pensionTypeId,
      pension_regime_id: pensionRegimeId,
      rebel_army_member: belongsRebelArmy,
      rebel_army_join_date: belongsRebelArmy ? rebelArmyDate : null,
      internationalist,
      filed_by_person_id: requestedByPersonId,
      phone: phone || null,
      popular_council: popularCouncil || null,
      termination_date: terminationDate || null,
      current_address: currentAddress,
      residence_province_id: residenceProvinceId,
      residence_municipality_id: residenceMunicipalityId,
      collection_agency_type_id: collectionAgencyTypeId,
      collection_agency_id: collectionAgencyId,
      bank_account: bankAccount || null,
      // Solo se envía si el usuario lo declara explícitamente (null = sin selección = omitir)
      ...(missingSalariesAttributable != null && missingSalariesAttributable !== 'unset' ? { missing_salaries_attributable: missingSalariesAttributable === 'true' } : {}),
      // Task 73/B-2: solo se envía si la rama es 'false' (no imputable) y el usuario lo declaró.
      // Ausente ⇒ backend usa N_eff × 12 (semántica histórica). La validación cruzada la hace el backend (422).
      ...(missingSalariesAttributable === 'false' && imputableSalaryMonths !== ''
        ? { imputable_salary_months: Number(imputableSalaryMonths) }
        : {}),
      // Task 74/Bloque C: solo se envía el bloque de invalidez si el pension_type es invalidez.
      // En las demás ramas el backend lo prohibe (422, D-7408); no los enviamos.
      ...(isInvalidezCase ? {
        disease_id: diseaseId,
        disease_origin: diseaseOrigin || null,
        requires_personal_care: requiresPersonalCare,
        temporary_disability: temporaryDisability,
        re_assessment_date: temporaryDisability ? (reAssessmentDate || null) : null,
      } : {}),
      // Bloque de defunción: solo se envía si el pension_type es fallecimiento.
      // Incluye disease_origin (Tipo de fallecimiento) y disease_id (Causa).
      ...(isFallecimientoCase ? {
        disease_id: diseaseId,
        disease_origin: diseaseOrigin || null,
        death_date: deathDate || null,
        death_certificate: deathCertificate || null,
        death_certificate_date: deathCertificateDate || null,
        forced_age_retirement: forcedAgeRetirement,
      } : {}),
    };
    try {
      if (isEdit && pensionCase) {
        const updateInput: UpdateCaseInput = {
          employer_entity_id: entityId,
          position_id: positionId,
          occupational_category_id: occCatId,
          educational_level_id: eduId,
          scientific_category_id: sciCatId,
          pension_type_id: pensionTypeId,
          pension_regime_id: pensionRegimeId,
          last_salary: Number(lastSalary) || 0,
          requested_at: requestedAt || null,
          // PATCH: si null (sin selección) no se envía; si 'unset' envía null; si true/false envía el valor
          ...(missingSalariesAttributable != null ? { missing_salaries_attributable: missingSalariesAttributable === 'unset' ? null : missingSalariesAttributable === 'true' } : {}),
          // Task 73/B-2: PATCH — null explícito limpia el divisor; la omisión no toca el valor almacenado.
          // Solo se acepta cuando missing_salaries_attributable = false (422 en el resto, D-7307(a)).
          imputable_salary_months: missingSalariesAttributable === 'false' && imputableSalaryMonths !== ''
            ? Number(imputableSalaryMonths)
            : null,
          // disease_id y disease_origin se envían para invalidez O fallecimiento (no ambos a la vez).
          // Si el pension_type resultante es de uno de esos dos tipos, enviamos los valores;
          // si no lo es, enviamos null para limpiarlos.
          disease_id: (isInvalidezCase || isFallecimientoCase) ? diseaseId : null,
          disease_origin: (isInvalidezCase || isFallecimientoCase) ? (diseaseOrigin || null) : null,
          requires_personal_care: isInvalidezCase ? requiresPersonalCare : null,
          temporary_disability: isInvalidezCase ? temporaryDisability : null,
          re_assessment_date: isInvalidezCase && temporaryDisability ? (reAssessmentDate || null) : null,
          // Bloque de defunción: solo fallecimiento.
          death_date: isFallecimientoCase ? (deathDate || null) : null,
          death_certificate: isFallecimientoCase ? (deathCertificate || null) : null,
          death_certificate_date: isFallecimientoCase ? (deathCertificateDate || null) : null,
          forced_age_retirement: isFallecimientoCase ? forcedAgeRetirement : null,
        };
        await updateMutation.mutateAsync({ id: pensionCase.id!, input: updateInput });
      } else {
        await createMutation.mutateAsync(input);
      }
      onClose();
    } catch {
      /* Errores del backend (422/409/500) son mostrados por mutation.onError
         que ahora muestra toast.errorDetail con los mensajes de validación. */
    }
  };

  const canSubmit = (isEdit || selectedPerson) && entityId && positionId && occCatId && eduId && sciCatId && pensionTypeId && pensionRegimeId && lastSalary !== '' && (!belongsRebelArmy || rebelArmyDate !== '');

  return (
    <Dialog open onClose={onClose} title={t(isEdit ? 'edit.title' : 'create.title')} description={t(isEdit ? 'edit.description' : 'create.description')} size="xl">
      <div className="space-y-4">
        {/* Proponente — búsqueda de persona con opción de registrar nueva */}
        {isEdit ? (
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.applicant_person_id')} *</label>
            <p className="text-sm text-muted-foreground italic">{pensionCase?.applicant ? [pensionCase.applicant.first_surname, pensionCase.applicant.first_name].filter(Boolean).join(' ') : '—'} ({t('edit.immutable')})</p>
          </div>
        ) : (
          <PersonSearchWithCreate
            label={t('form.applicant_person_id')}
            placeholder={t('form.search_person')}
            required
            onSelect={(p) => setSelectedPerson(p.id)}
          />
        )}
        {/* Entidad + Último salario */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.employer_entity_id')} *</label>
            <SearchSelect
              value={entityId || undefined}
              onChange={(v) => setEntityId(Number(v) || 0)}
              loadOptions={async (q) => {
                const r = await http.get<EntityListResponse>('/entities', { params: { per_page: 100, ...(q && { search: q }) } });
                return (r.data.data ?? []).map((e) => ({ value: e.id, label: e.name ?? e.tax_id_number, secondary: e.code }));
              }}
              initialDisplayValue={(pensionCase as { employer_entity?: { name?: string } })?.employer_entity?.name}
              placeholder={tc('actions.select')}
              required
              error={!entityId}
            />
          </div>
          <div><label className="block text-sm font-medium mb-1">{t('form.last_salary')} *</label>
            <Input type="number" step="0.01" min="0" placeholder="0.00" value={lastSalary} onChange={(e) => setLastSalary(e.target.value)} /></div>
        </div>
        {/* Solicitado por + Fecha de desvinculación */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{t('form.requested_by')}</label>
            <SearchSelect
              value={requestedByPersonId ?? undefined}
              onChange={(v) => setRequestedByPersonId(v ? Number(v) : null)}
              options={signatures.map((s) => ({
                value: s.person.id ?? 0,
                label: personFullName(s.person) || s.person.identity_number || '—',
                secondary: s.position.name,
              }))}
              placeholder={!entityId ? t('form.requested_by_disabled') : isLoadingSignatures ? tc('status.loading') + '…' : signatures.length === 0 ? t('form.requested_by_empty') : tc('actions.select')}
              disabled={isEdit || !entityId || isLoadingSignatures || signatures.length === 0}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('form.requested_by_help')}</p>
          </div>
          <div><label className="block text-sm font-medium mb-1">{t('form.termination_date')}</label>
            <DatePickerField disabled={isEdit} value={terminationDate} onChange={setTerminationDate} /></div>
        </div>
        {/* Cargo + Categoría ocupacional (búsqueda con crear nuevo) */}
        <div className="grid grid-cols-2 gap-3">
          <CatalogSearchSelect
            type="positions"
            label={t('form.position_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setPositionId(item.id)}
          />
          <CatalogSearchSelect
            type="occupational-categories"
            label={t('form.occupational_category_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setOccCatId(item.id)}
          />
        </div>
        {/* Nivel educacional + Categoría científica (búsqueda con crear nuevo) */}
        <div className="grid grid-cols-2 gap-3">
          <CatalogSearchSelect
            type="educational-levels"
            label={t('form.educational_level_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setEduId(item.id)}
          />
          <CatalogSearchSelect
            type="scientific-categories"
            label={t('form.scientific_category_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setSciCatId(item.id)}
          />
        </div>
        {/* Tipo de pensión + Régimen de pensión (búsqueda con crear nuevo) */}
        <div className="grid grid-cols-2 gap-3">
          <CatalogSearchSelect
            type="pension-types"
            label={t('form.pension_type_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setPensionTypeId(item.id)}
          />
          <CatalogSearchSelect
            type="pension-regimes"
            label={t('form.pension_regime_id')}
            placeholder={tc('actions.search') + '…'}
            required
            onSelect={(item) => setPensionRegimeId(item.id)}
          />
        </div>
        {/* Domicilio y cobro del promovente */}
        <div className="border-t border-border pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('form.residence_section')}</h3>
          <div><label className="block text-sm font-medium mb-1">{t('form.current_address')} *</label>
            <Input type="text" autoComplete="street-address" placeholder="Calle 8 #10 entre 5 y 7, Playa" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">{t('form.residence_province_id')} *</label>
              <SearchSelect
                value={residenceProvinceId || undefined}
                onChange={(v) => { const n = Number(v) || 0; setResidenceProvinceId(n); setResidenceMunicipalityId(0); }}
                options={(provincesData?.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
                placeholder={tc('actions.select')}
                disabled={isEdit}
                required
                error={!residenceProvinceId}
              /></div>
            <div><label className="block text-sm font-medium mb-1">{t('form.residence_municipality_id')} *</label>
              <SearchSelect
                value={residenceMunicipalityId || undefined}
                onChange={(v) => setResidenceMunicipalityId(Number(v) || 0)}
                options={(residenceMunisData?.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
                placeholder={tc('actions.select')}
                disabled={!residenceProvinceId}
                required
                error={!residenceMunicipalityId}
              /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CatalogSearchSelect
              type="agency-types"
              label={t('form.collection_agency_type_id')}
              placeholder={tc('actions.search') + '…'}
              required
              initialDisplayValue={pensionCase?.collection_agency_type?.name}
              initialSelectedId={pensionCase?.collection_agency_type_id}
              onSelect={(item) => { setCollectionAgencyTypeId(item.id); setCollectionAgencyId(0); }}
            />
            <div><label className="block text-sm font-medium mb-1">{t('form.collection_agency_id')} *</label>
              <SearchSelect
                value={collectionAgencyId || undefined}
                onChange={(v) => setCollectionAgencyId(Number(v) || 0)}
                options={(collectionAgenciesData?.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
                placeholder={tc('actions.select')}
                disabled={!collectionAgencyTypeId}
                required
                error={!collectionAgencyId}
              /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">{t('form.bank_account')}</label>
            <Input type="text" autoComplete="off" placeholder="01234567890123456789012345678" maxLength={34} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} /></div>
        </div>
        {/* Task 52/S8.8: declaración de imputabilidad de salarios ausentes */}
        <div className="p-3 rounded-md border border-border space-y-2">
          <div><label className="block text-sm font-medium mb-1">{t('form.missing_salaries_attributable')}</label>
            <SearchSelect
              value={missingSalariesAttributable ?? undefined}
              onChange={(v) => handleAttributableChange(v as 'unset' | 'true' | 'false')}
              options={[
                { value: 'unset', label: t('form.missing_salaries_attributable_unset') },
                { value: 'true', label: t('form.missing_salaries_attributable_true') },
                { value: 'false', label: t('form.missing_salaries_attributable_false') },
              ]}
              placeholder={tc('actions.select')}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('form.missing_salaries_attributable_help')}</p>
          </div>
          {/* Task 73/B-2: meses de salarios imputables — divisor EXPLÍCITO del SPM.
              Solo se puede declarar cuando missing_salaries_attributable === 'false' (no imputable).
              null ⇒ divisor = N_eff × 12 (semántica histórica). El backend valida la coherencia (422). */}
          {missingSalariesAttributable === 'false' && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.imputable_salary_months')}</label>
              <Input
                type="number"
                min="1"
                max="180"
                step="1"
                placeholder="58"
                value={imputableSalaryMonths}
                onChange={(e) => setImputableSalaryMonths(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('form.imputable_salary_months_help')}</p>
            </div>
          )}
        </div>
        {/* Task 74/Bloque C: bloque de invalidez del expediente.
            Visible solo cuando el pension_type seleccionado tiene retirement_type === 'invalidez'.
            En las demás ramas el backend prohíbe estos campos (422, D-7408); no se envían.
            re_assessment_date solo se muestra si temporary_disability === true (D-7409,
            estrictamente futura). El frontend NO bloquea el submit — el backend valida. */}
        {isInvalidezCase && (
          <div className="p-3 rounded-md border border-primary/40 bg-primary/5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t('form.bloque_invalidez_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('form.bloque_invalidez_help')}</p>
            <div className="grid grid-cols-2 gap-3">
              <CatalogSearchSelect
                type="diseases"
                label={t('form.disease_id')}
                placeholder={tc('actions.search') + '…'}
                required
                onSelect={(item) => setDiseaseId(item.id)}
              />
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.disease_origin')} *</label>
                <SearchSelect
                  value={diseaseOrigin || undefined}
                  onChange={(v) => setDiseaseOrigin(v as 'comun' | 'profesional' | 'accidente_trabajo' | 'accidente_trayecto')}
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
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={requiresPersonalCare} onChange={(e) => setRequiresPersonalCare(e.target.checked)} className="w-4 h-4 rounded border-input" />
                <span className="text-sm font-medium">{t('form.requires_personal_care')}</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={temporaryDisability} onChange={(e) => { setTemporaryDisability(e.target.checked); if (!e.target.checked) setReAssessmentDate(''); }} className="w-4 h-4 rounded border-input" />
                <span className="text-sm font-medium">{t('form.temporary_disability')}</span>
              </label>
            </div>
            {temporaryDisability && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.re_assessment_date')} *</label>
                <DatePickerField value={reAssessmentDate} onChange={setReAssessmentDate} />
                <p className="text-xs text-amber-700 mt-1">{t('form.re_assessment_date_help')}</p>
              </div>
            )}
          </div>
        )}
        {/* Bloque de defunción: visible solo cuando el pension_type es fallecimiento.
            Incluye disease_origin (Tipo de fallecimiento) y disease_id (Causa) —
            reutiliza el estado del bloque de invalidez ya que solo uno de los dos
            bloques es visible a la vez (invalidez OR fallecimiento, nunca ambos). */}
        {isFallecimientoCase && (
          <div className="p-3 rounded-md border border-primary/40 bg-primary/5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t('form.death_block_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('form.death_block_help')}</p>
            <div className="grid grid-cols-2 gap-3">
              <CatalogSearchSelect
                type="diseases"
                label={t('form.death_cause')}
                placeholder={tc('actions.search') + '…'}
                required
                initialDisplayValue={(pensionCase as { disease_name?: string })?.disease_name}
                initialSelectedId={pensionCase?.disease_id}
                onSelect={(item) => setDiseaseId(item.id)}
              />
              <div>
                <label className="block text-sm font-medium mb-1">{t('form.death_origin_type')} *</label>
                <SearchSelect
                  value={diseaseOrigin || undefined}
                  onChange={(v) => setDiseaseOrigin(v as 'comun' | 'profesional' | 'accidente_trabajo' | 'accidente_trayecto')}
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
              <Input type="text" maxLength={100} placeholder="Certificado N.º" value={deathCertificate} onChange={(e) => setDeathCertificate(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 pt-1">
              <input type="checkbox" checked={forcedAgeRetirement} onChange={(e) => setForcedAgeRetirement(e.target.checked)} className="w-4 h-4 mt-0.5" />
              <span className="text-sm">
                <strong>{t('form.forced_age_retirement')}</strong>
                <span className="block text-xs text-muted-foreground mt-0.5">{t('form.forced_age_retirement_help')}</span>
              </span>
            </label>
          </div>
        )}
        {/* Ejército Rebelde + Internacionalista */}
        <div className="p-3 rounded-md border border-border space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={belongsRebelArmy} disabled={isEdit} onChange={(e) => { setBelongsRebelArmy(e.target.checked); if (!e.target.checked) setRebelArmyDate(''); }} className="w-4 h-4 rounded border-input" />
            <span className="text-sm font-medium">{t('form.rebel_army_member')}</span>
          </label>
          {belongsRebelArmy && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.rebel_army_join_date')} *</label>
              <DatePickerField value={rebelArmyDate} onChange={setRebelArmyDate} />
              {!rebelArmyDate && <p className="text-xs text-destructive mt-1">{t('form.rebel_army_date_required')}</p>}
            </div>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={internationalist} disabled={isEdit} onChange={(e) => setInternationalist(e.target.checked)} className="w-4 h-4 rounded border-input" />
            <span className="text-sm font-medium">{t('form.internationalist')}</span>
          </label>
        </div>
        {/* Fecha de solicitud (editable solo en edición) */}
        {isEdit && (
          <div><label className="block text-sm font-medium mb-1">{t('detail.fields.requested_at')}</label>
            <DatePickerField value={requestedAt} onChange={setRequestedAt} /></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('form.phone')}</label>
            <Input type="text" autoComplete="tel" placeholder="+53 5 555 1234" maxLength={30} disabled={isEdit} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">{t('form.popular_council')}</label>
            <Input type="text" placeholder="Consejo Popular Playa" maxLength={120} disabled={isEdit} value={popularCouncil} onChange={(e) => setPopularCouncil(e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="button" disabled={!canSubmit || createMutation.isPending || updateMutation.isPending} onClick={onSubmit}>{(createMutation.isPending || updateMutation.isPending) ? tc('status.loading') + '…' : tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
