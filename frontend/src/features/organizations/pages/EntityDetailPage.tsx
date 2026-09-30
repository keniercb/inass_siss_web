import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Edit, Building2, FileText, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { useEntity, useEntitySignatures } from '../api/queries';
import { useDeleteSignature } from '../api/mutations';
import { Button } from '@/components/ui/Button';
import { EntityFormModal } from '../components/EntityFormModal';
import { AuthorizedSignatureFormModal } from '../components/AuthorizedSignatureFormModal';
import { cn } from '@/lib/utils';

type Tab = 'data' | 'signatures' | 'hierarchy';

export function EntityDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('organizations');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('data');
  const [editOpen, setEditOpen] = useState(false);
  const [sigFormOpen, setSigFormOpen] = useState(false);

  const { data: entity, isLoading, isError } = useEntity(id);
  const { data: signatures } = useEntitySignatures(id);
  const deleteSigMutation = useDeleteSignature(id);
  const canManage = can('organizations.manage');

  if (isLoading) return <div className="max-w-7xl mx-auto"><p className="text-muted-foreground">{tc('status.loading')}…</p></div>;
  if (isError || !entity) return <div className="max-w-7xl mx-auto text-center py-12"><h1 className="text-xl font-semibold mb-2">{t('entities.detail.not_found')}</h1><button onClick={() => navigate('/entidades')} className="text-primary hover:underline">{t('entities.detail.back_to_list')}</button></div>;

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/entidades')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ChevronLeft className="w-4 h-4" />{t('entities.detail.back_to_list')}</button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{entity.name ?? entity.code}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-mono">{entity.code}</span> · NIT: <span className="font-mono">{entity.tax_id_number}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">{entity.organization?.name} · {entity.entity_type?.name}</p>
        </div>
        {canManage && <Button variant="outline" onClick={() => setEditOpen(true)}><Edit className="w-4 h-4" />{tc('actions.edit')}</Button>}
      </div>
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')}><Building2 className="w-4 h-4" />{t('entities.detail.tabs.data')}</TabButton>
          <TabButton active={activeTab === 'signatures'} onClick={() => setActiveTab('signatures')}><FileText className="w-4 h-4" />{t('entities.detail.tabs.signatures')}</TabButton>
          <TabButton active={activeTab === 'hierarchy'} onClick={() => setActiveTab('hierarchy')}><ShieldCheck className="w-4 h-4" />{t('entities.detail.tabs.hierarchy')}</TabButton>
        </nav>
      </div>

      {activeTab === 'data' && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          {entity.name && <Field label={t('entities.detail.fields.name')} value={entity.name} fullWidth />}
          <Field label={t('entities.detail.fields.code')} value={entity.code} mono />
          <Field label={t('entities.detail.fields.tax_id_number')} value={entity.tax_id_number} mono />
          <Field label={t('entities.detail.fields.organization')} value={entity.organization?.name ?? '—'} />
          <Field label={t('entities.detail.fields.entity_type')} value={entity.entity_type?.name ?? '—'} />
          <Field label={t('entities.detail.fields.province')} value={entity.province?.name ?? '—'} />
          <Field label={t('entities.detail.fields.municipality')} value={entity.municipality?.name ?? '—'} />
          <Field label={t('entities.detail.fields.address')} value={entity.address} fullWidth />
          <Field label={t('entities.detail.fields.phone')} value={entity.phone ?? '—'} />
          <Field label={t('entities.detail.fields.fax')} value={entity.fax ?? '—'} />
          <Field label={t('entities.detail.fields.email')} value={entity.email ?? '—'} />
          <Field label={t('entities.detail.fields.director')} value={entity.director ? `${entity.director.first_name} ${entity.director.first_surname}` : '—'} />
          <Field label={t('entities.detail.fields.economic_director')} value={entity.economic_director ? `${entity.economic_director.first_name} ${entity.economic_director.first_surname}` : '—'} />
          {entity.parent_entity && <Field label={t('entities.detail.fields.parent_entity')} value={`${entity.parent_entity.code} — ${entity.parent_entity.name}`} />}
          {entity.social_purpose && <Field label={t('entities.detail.fields.social_purpose')} value={entity.social_purpose} fullWidth />}
        </div>
      )}

      {activeTab === 'signatures' && (
        <div>
          {canManage && (
            <div className="mb-4">
              <Button onClick={() => setSigFormOpen(true)}><Plus className="w-4 h-4" />{t('signatures.create.button')}</Button>
            </div>
          )}
          {signatures && signatures.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="bg-muted text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('signatures.list.columns.person')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('signatures.list.columns.position')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('signatures.list.columns.validity')}</th>
                {canManage && <th className="text-right px-4 py-3 font-medium">{tc('table.actions')}</th>}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {signatures.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs">{s.person?.identity_number} — {s.person?.first_name} {s.person?.first_surname}</td>
                    <td className="px-4 py-3">{s.position?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.valid_from ?? '—'} → {s.valid_to ?? '∞'}</td>
                    {canManage && <td className="px-4 py-3 text-right"><button onClick={() => deleteSigMutation.mutate(s.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyTabContent icon={FileText} title={t('entities.detail.tabs_empty.signatures')} description={t('entities.detail.tabs_empty.signatures_description')} />}
        </div>
      )}

      {activeTab === 'hierarchy' && (
        <EmptyTabContent icon={ShieldCheck} title={t('entities.detail.tabs_empty.hierarchy')} description={t('entities.detail.tabs_empty.hierarchy_description')} />
      )}

      {editOpen && <EntityFormModal entity={entity} onClose={() => setEditOpen(false)} />}
      {sigFormOpen && <AuthorizedSignatureFormModal entityId={entity.id!} onClose={() => setSigFormOpen(false)} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn('flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{children}</button>;
}

function Field({ label, value, mono, fullWidth }: { label: string; value: string; mono?: boolean; fullWidth?: boolean }) {
  return <div className={fullWidth ? 'col-span-2' : ''}><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p><p className={cn('text-sm text-foreground', mono && 'font-mono')}>{value}</p></div>;
}

function EmptyTabContent({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return <div className="flex flex-col items-center justify-center min-h-[30vh] text-center"><div className="p-4 rounded-full bg-muted mb-4"><Icon className="w-10 h-10 text-muted-foreground" /></div><h2 className="text-lg font-medium text-foreground mb-1">{title}</h2><p className="text-sm text-muted-foreground max-w-md">{description}</p></div>;
}
