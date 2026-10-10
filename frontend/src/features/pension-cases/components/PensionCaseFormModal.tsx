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
  // Task 52/S8.8: declaración de imputabilidad (null sin déficit, true/false con déficit)
  // Estado triestado: 'unset' (null), 'true' (imputable), 'false' (no imputable)
  const [missingSalariesAttributable, setMissingSalariesAttributable] = useState<'unset' | 'true' | 'false'>(
    pensionCase?.missing_salaries_attributable == null ? 'unset'
      : pensionCase.missing_salaries_attributable ? 'true' : 'false'
  );

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
      // Task 52/S8.8: solo se envía si el usuario lo declara explícitamente
      ...(missingSalariesAttributable !== 'unset' ? { missing_salaries_attributable: missingSalariesAttributable === 'true' } : {}),
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
          // Task 52/S8.8: PATCH — enviamos siempre (null limpia la declaración previa)
          missing_salaries_attributable: missingSalariesAttributable === 'unset' ? null : missingSalariesAttributable === 'true',
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
                label: s.person.full_name ?? `${s.person.first_name ?? ''} ${s.person.first_surname ?? ''}`.trim() ?? s.person.identity_number ?? '—',
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
            <Input type="text" placeholder="Calle 8 #10 entre 5 y 7, Playa" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} /></div>
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
            <Input type="text" placeholder="01234567890123456789012345678" maxLength={34} value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} /></div>
        </div>
        {/* Task 52/S8.8: declaración de imputabilidad de salarios ausentes */}
        <div className="p-3 rounded-md border border-border space-y-2">
          <div><label className="block text-sm font-medium mb-1">{t('form.missing_salaries_attributable')}</label>
            <SearchSelect
              value={missingSalariesAttributable}
              onChange={(v) => setMissingSalariesAttributable(v as 'unset' | 'true' | 'false')}
              options={[
                { value: 'unset', label: t('form.missing_salaries_attributable_unset') },
                { value: 'true', label: t('form.missing_salaries_attributable_true') },
                { value: 'false', label: t('form.missing_salaries_attributable_false') },
              ]}
              placeholder={t('form.missing_salaries_attributable_unset')}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('form.missing_salaries_attributable_help')}</p>
          </div>
        </div>
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
            <Input type="text" placeholder="+53 5 555 1234" maxLength={30} disabled={isEdit} value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
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
