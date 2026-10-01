import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateCase } from '../api/mutations';
import { type CreateCaseInput } from '../schemas/pension-case.schema';
import { PersonSearchWithCreate } from '@/features/people/components/PersonSearchWithCreate';
import { cn } from '@/lib/utils';
import { http } from '@/lib/http';

interface CatalogItem { id: number; name: string; }
interface CatalogListResponse { data: CatalogItem[]; }
interface EntityListItem { id: number; code: string; tax_id_number: string; }

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

interface PensionCaseFormModalProps { onClose: () => void; }

export function PensionCaseFormModal({ onClose }: PensionCaseFormModalProps) {
  const { t } = useTranslation('pension-cases');
  const { t: tc } = useTranslation('common');
  const createMutation = useCreateCase();

  // Cargar catálogos para selects
  const { data: positionsData } = useQuery({ queryKey: ['catalogs', 'positions', 'all'], queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/positions', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });
  const { data: occCatData } = useQuery({ queryKey: ['catalogs', 'occupational-categories', 'all'], queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/occupational-categories', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });
  const { data: eduData } = useQuery({ queryKey: ['catalogs', 'educational-levels', 'all'], queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/educational-levels', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });
  const { data: sciCatData } = useQuery({ queryKey: ['catalogs', 'scientific-categories', 'all'], queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/scientific-categories', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });
  const { data: pensionTypesData } = useQuery({ queryKey: ['catalogs', 'pension-types', 'all'], queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/pension-types', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });
  const { data: pensionRegimesData } = useQuery({ queryKey: ['catalogs', 'pension-regimes', 'all'], queryFn: async () => { const r = await http.get<CatalogListResponse>('/catalogs/pension-regimes', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });

  // Cargar entidades
  const { data: entitiesData } = useQuery({ queryKey: ['entities', 'all'], queryFn: async () => { const r = await http.get<{ data: EntityListItem[] }>('/entities', { params: { per_page: 100 } }); return r.data; }, staleTime: 5 * 60 * 1000 });

  // Estado local
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [entityId, setEntityId] = useState(0);
  // "Solicitado por" — persona autorizada del centro de trabajo seleccionado.
  // El backend no incluye este campo en el request de POST /pension-cases todavía
  // (docs.json por actualizar); cuando se publique, añadir `requested_by_person_id`
  // (o el nombre que defina el backend) al CreateCaseInput y al payload.
  const [requestedByPersonId, setRequestedByPersonId] = useState<number | null>(null);
  // Cargar firmas autorizadas activas del centro de trabajo seleccionado
  const { data: signaturesData, isLoading: isLoadingSignatures } = useQuery<AuthorizedSignatureListResponse>({
    queryKey: ['authorized-signatures', 'by-entity', entityId],
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
  const [positionId, setPositionId] = useState(0);
  const [occCatId, setOccCatId] = useState(0);
  const [eduId, setEduId] = useState(0);
  const [sciCatId, setSciCatId] = useState(0);
  const [lastSalary, setLastSalary] = useState('');
  const [pensionTypeId, setPensionTypeId] = useState(0);
  const [pensionRegimeId, setPensionRegimeId] = useState(0);
  const [belongsRebelArmy, setBelongsRebelArmy] = useState(false);
  const [rebelArmyDate, setRebelArmyDate] = useState('');

  const selectClass = cn('flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50');

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
    };
    try {
      await createMutation.mutateAsync(input);
      onClose();
    } catch { /* handled by mutation */ }
  };

  const canSubmit = selectedPerson && entityId && positionId && occCatId && eduId && sciCatId && pensionTypeId && pensionRegimeId && lastSalary !== '' && (!belongsRebelArmy || rebelArmyDate !== '');

  return (
    <Dialog open onClose={onClose} title={t('create.title')} description={t('create.description')} size="xl">
      <div className="space-y-4">
        {/* Proponente — búsqueda de persona con opción de registrar nueva */}
        <PersonSearchWithCreate
          label={t('form.applicant_person_id')}
          placeholder={t('form.search_person')}
          required
          onSelect={(p) => setSelectedPerson(p.id)}
        />
        {/* Entidad + Último salario */}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('form.employer_entity_id')} *</label>
            <select className={selectClass} value={entityId} onChange={(e) => setEntityId(Number(e.target.value))}>
              <option value="">{tc('actions.select')}</option>{(entitiesData?.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.code} — {e.tax_id_number}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium mb-1">{t('form.last_salary')} *</label>
            <Input type="number" step="0.01" min="0" placeholder="0.00" value={lastSalary} onChange={(e) => setLastSalary(e.target.value)} /></div>
        </div>
        {/* Solicitado por — persona autorizada del centro de trabajo (carga condicional) */}
        <div>
          <label className="block text-sm font-medium mb-1">{t('form.requested_by')}</label>
          <select
            className={selectClass}
            value={requestedByPersonId ?? 0}
            disabled={!entityId || isLoadingSignatures || signatures.length === 0}
            onChange={(e) => setRequestedByPersonId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{!entityId ? t('form.requested_by_disabled') : isLoadingSignatures ? tc('status.loading') + '…' : signatures.length === 0 ? t('form.requested_by_empty') : tc('actions.select')}</option>
            {signatures.map((s) => {
              const label = s.person.full_name ?? `${s.person.first_name ?? ''} ${s.person.first_surname ?? ''}`.trim() ?? s.person.identity_number;
              return <option key={s.id} value={s.person.id}>{label} — {s.position.name}</option>;
            })}
          </select>
          <p className="text-xs text-muted-foreground mt-1">{t('form.requested_by_help')}</p>
        </div>
        {/* Cargo + Categorías */}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('form.position_id')} *</label>
            <select className={selectClass} value={positionId} onChange={(e) => setPositionId(Number(e.target.value))}>
              <option value="">{tc('actions.select')}</option>{(positionsData?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium mb-1">{t('form.occupational_category_id')} *</label>
            <select className={selectClass} value={occCatId} onChange={(e) => setOccCatId(Number(e.target.value))}>
              <option value="">{tc('actions.select')}</option>{(occCatData?.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('form.educational_level_id')} *</label>
            <select className={selectClass} value={eduId} onChange={(e) => setEduId(Number(e.target.value))}>
              <option value="">{tc('actions.select')}</option>{(eduData?.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium mb-1">{t('form.scientific_category_id')} *</label>
            <select className={selectClass} value={sciCatId} onChange={(e) => setSciCatId(Number(e.target.value))}>
              <option value="">{tc('actions.select')}</option>{(sciCatData?.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
        </div>
        {/* Tipo de pensión + Régimen de pensión */}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-sm font-medium mb-1">{t('form.pension_type_id')} *</label>
            <select className={selectClass} value={pensionTypeId} onChange={(e) => setPensionTypeId(Number(e.target.value))}>
              <option value="">{tc('actions.select')}</option>{(pensionTypesData?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium mb-1">{t('form.pension_regime_id')} *</label>
            <select className={selectClass} value={pensionRegimeId} onChange={(e) => setPensionRegimeId(Number(e.target.value))}>
              <option value="">{tc('actions.select')}</option>{(pensionRegimesData?.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
        </div>
        {/* Ejército Rebelde */}
        <div className="p-3 rounded-md border border-border space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={belongsRebelArmy} onChange={(e) => { setBelongsRebelArmy(e.target.checked); if (!e.target.checked) setRebelArmyDate(''); }} className="w-4 h-4 rounded border-input" />
            <span className="text-sm font-medium">{t('form.rebel_army_member')}</span>
          </label>
          {belongsRebelArmy && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('form.rebel_army_join_date')} *</label>
              <Input type="date" value={rebelArmyDate} onChange={(e) => setRebelArmyDate(e.target.value)} />
              {!rebelArmyDate && <p className="text-xs text-destructive mt-1">{t('form.rebel_army_date_required')}</p>}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button type="button" disabled={!canSubmit || createMutation.isPending} onClick={onSubmit}>{createMutation.isPending ? tc('status.loading') + '…' : tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
