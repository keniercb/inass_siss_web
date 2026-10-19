import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Clock, ArrowRight } from 'lucide-react';
import { usePensioner } from '../api/queries';
import { formatDate, formatCUP, cn } from '@/lib/utils';

type Tab = 'summary' | 'history';

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-approved',
  suspended: 'badge-under_review',
  terminated: 'badge-rejected',
};

export function PensionerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('pensioners');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  const { data: pensioner, isLoading, isError } = usePensioner(id);

  if (isLoading) return <div className="max-w-7xl mx-auto"><p className="text-muted-foreground">{tc('status.loading')}…</p></div>;
  if (isError || !pensioner) return (
    <div className="max-w-7xl mx-auto text-center py-12">
      <h1 className="text-xl font-semibold text-foreground mb-2">{t('detail.not_found')}</h1>
      <Link to="/pensionados" className="text-primary hover:underline">{t('detail.back_to_list')}</Link>
    </div>
  );

  const person = pensioner.person;
  const personName = person ? [person.first_surname, person.second_surname, person.first_name, person.middle_name].filter(Boolean).join(' ') : '—';

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/pensionados')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" />{t('detail.back_to_list')}
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{personName}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{person?.identity_number ?? '—'} · <span className={cn('badge', STATUS_BADGE[pensioner.status ?? 'active'] ?? '')}>{t(`list.status.${pensioner.status}`)}</span></p>
        </div>
      </div>
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <button onClick={() => setActiveTab('summary')} className={cn('flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t('detail.tabs.summary')}</button>
          <button onClick={() => setActiveTab('history')} className={cn('flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}><Clock className="w-4 h-4" />{t('detail.tabs.history')}</button>
        </nav>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Datos de la persona */}
          {person && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.person_data')}</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label={t('detail.fields.identity_number')} value={person.identity_number ?? '—'} mono />
                <Field label={t('detail.fields.full_name')} value={personName} />
                <Field label={t('detail.fields.sex')} value={person.sex === 'M' ? tc('people:detail.fields.sex_male') : tc('people:detail.fields.sex_female')} />
                <Field label={t('detail.fields.birth_date')} value={person.birth_date ? formatDate(person.birth_date) : '—'} />
                <Field label={t('detail.fields.address')} value={person.address ?? '—'} fullWidth />
                <Field label={t('detail.fields.deceased')} value={person.deceased ? tc('booleans.yes') : tc('booleans.no')} />
              </div>
            </div>
          )}
          {/* Datos de la pensión */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.pension_data')}</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label={t('detail.fields.amount')} value={pensioner.amount != null ? formatCUP(Number(pensioner.amount)) : '—'} mono />
              <Field label={t('detail.fields.status')} value={t(`list.status.${pensioner.status}`)} />
              <Field label={t('detail.fields.status_reason')} value={pensioner.status_reason ?? '—'} />
              <Field label={t('detail.fields.pension_type')} value={pensioner.pension_type?.name ?? '—'} />
              <Field label={t('detail.fields.pension_regime')} value={pensioner.pension_regime?.name ?? '—'} />
              <Field label={t('detail.fields.origin_case')} value={pensioner.origin_case?.number ?? '—'} mono />
              <Field label={t('detail.fields.created_at')} value={pensioner.created_at ? formatDate(pensioner.created_at) : '—'} />
              <Field label={t('detail.fields.updated_at')} value={pensioner.updated_at ? formatDate(pensioner.updated_at) : '—'} />
            </div>
          </div>
          {/* Controles bancarios */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t('detail.section.bank_controls')}</h3>
            <p className="text-sm text-muted-foreground italic">{t('detail.bank_controls_empty')}</p>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="max-w-3xl">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t('detail.section.status_history')}</h3>
          {(pensioner.status_history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-0">
              {(pensioner.status_history ?? []).map((row, idx) => {
                const isLast = idx === (pensioner.status_history ?? []).length - 1;
                return (
                  <div key={idx} className="relative flex gap-4 pb-6">
                    {!isLast && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center z-10">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {row.from_status && <span className={cn('badge', STATUS_BADGE[row.from_status] ?? '')}>{t(`list.status.${row.from_status}`)}</span>}
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className={cn('badge', STATUS_BADGE[row.to_status ?? 'active'] ?? '')}>{t(`list.status.${row.to_status}`)}</span>
                        {row.changed_at && <span className="text-xs text-muted-foreground ml-auto">{formatDate(row.changed_at)}</span>}
                      </div>
                      {row.changed_by?.name && <p className="text-xs text-muted-foreground mb-1">{t('detail.fields.identity_number')}: {row.changed_by.name}</p>}
                      {row.status_reason && <p className="text-sm text-foreground bg-muted/50 rounded-md p-2 mt-1">{row.status_reason}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, fullWidth }: { label: string; value: string; mono?: boolean; fullWidth?: boolean }) {
  return <div className={fullWidth ? 'col-span-2' : ''}><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p><p className={cn('text-sm text-foreground', mono && 'font-mono')}>{value}</p></div>;
}
