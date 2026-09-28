import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Edit, Skull, FileText, Wallet, ShieldCheck,
  UserCheck, AlertTriangle,
} from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePerson } from '../api/queries';
import { formatCI, getBirthDateFromCI } from '@/lib/cuban-ci';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { PersonFormModal } from '../components/PersonFormModal';
import { DeathRegistrationModal } from '../components/DeathRegistrationModal';
import { cn } from '@/lib/utils';

type Tab = 'data' | 'cases' | 'pensioner' | 'audit';

export function PersonDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('people');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('data');
  const [editOpen, setEditOpen] = useState(false);
  const [deathOpen, setDeathOpen] = useState(false);

  const { data: person, isLoading, isError } = usePerson(id);
  const canManage = can('people.manage');

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <p className="text-muted-foreground">{tc('status.loading')}…</p>
      </div>
    );
  }

  if (isError || !person) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-semibold mb-2">{t('detail.not_found')}</h1>
        <Link to="/personas" className="text-primary hover:underline">
          {t('detail.back_to_list')}
        </Link>
      </div>
    );
  }

  const fullName = [person.first_surname, person.second_surname, person.first_name, person.middle_name]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate('/personas')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('detail.back_to_list')}
      </button>

      {/* Banner fallecido */}
      {person.deceased && (
        <div className="mb-4 p-4 rounded-md bg-destructive/10 border border-destructive/30 flex items-center gap-3">
          <Skull className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">{t('detail.deceased_banner')}</p>
            {person.death_date && (
              <p className="text-xs text-muted-foreground">
                {t('detail.death_date')}: {formatDate(person.death_date)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{fullName}</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            CI: {formatCI(person.identity_number ?? '')}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="w-4 h-4" />
              {tc('actions.edit')}
            </Button>
            {!person.deceased && (
              <Button variant="destructive" onClick={() => setDeathOpen(true)}>
                <Skull className="w-4 h-4" />
                {t('detail.register_death')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <nav className="flex gap-4">
          <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')}>
            <UserCheck className="w-4 h-4" />
            {t('detail.tabs.data')}
          </TabButton>
          <TabButton active={activeTab === 'cases'} onClick={() => setActiveTab('cases')}>
            <FileText className="w-4 h-4" />
            {t('detail.tabs.cases')}
          </TabButton>
          <TabButton active={activeTab === 'pensioner'} onClick={() => setActiveTab('pensioner')}>
            <Wallet className="w-4 h-4" />
            {t('detail.tabs.pensioner')}
          </TabButton>
          <TabButton active={activeTab === 'audit'} onClick={() => setActiveTab('audit')}>
            <ShieldCheck className="w-4 h-4" />
            {t('detail.tabs.audit')}
          </TabButton>
        </nav>
      </div>

      {/* Contenido según tab */}
      {activeTab === 'data' && <DataTab person={person} t={t} />}

      {activeTab === 'cases' && (
        <EmptyTabContent
          icon={FileText}
          title={t('detail.tabs_empty.cases')}
          description={t('detail.tabs_empty.cases_description')}
          sprint="FE-S5"
        />
      )}

      {activeTab === 'pensioner' && (
        <EmptyTabContent
          icon={Wallet}
          title={t('detail.tabs_empty.pensioner')}
          description={t('detail.tabs_empty.pensioner_description')}
          sprint="FE-S9"
        />
      )}

      {activeTab === 'audit' && (
        <EmptyTabContent
          icon={ShieldCheck}
          title={t('detail.tabs_empty.audit')}
          description={t('detail.tabs_empty.audit_description')}
          sprint="FE-S12"
        />
      )}

      {editOpen && <PersonFormModal person={person} onClose={() => setEditOpen(false)} />}
      {deathOpen && <DeathRegistrationModal person={person} onClose={() => setDeathOpen(false)} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function DataTab({ person, t }: { person: import('@/types/api').components['schemas']['Person']; t: (key: string) => string }) {
  const ciBirthDate = person.identity_number ? getBirthDateFromCI(person.identity_number) : null;
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
      <Field label={t('detail.fields.identity_number')} value={formatCI(person.identity_number ?? '')} mono />
      <Field label={t('detail.fields.citizen_card_id')} value={person.citizen_card_id ?? '—'} />
      <Field label={t('detail.fields.full_name')} value={[person.first_surname, person.second_surname, person.first_name, person.middle_name].filter(Boolean).join(' ')} />
      <Field label={t('detail.fields.sex')} value={person.sex === 'M' ? t('detail.fields.sex_male') : t('detail.fields.sex_female')} />
      <Field label={t('detail.fields.birth_date')} value={person.birth_date ? formatDate(person.birth_date) : '—'} />
      {ciBirthDate && (
        <Field label={t('detail.fields.birth_date_from_ci')} value={formatDate(ciBirthDate.toISOString())} hint />
      )}
      <Field label={t('detail.fields.address')} value={person.address ?? '—'} fullWidth />
      <Field label={t('detail.fields.father_name')} value={person.father_name ?? '—'} />
      <Field label={t('detail.fields.mother_name')} value={person.mother_name ?? '—'} />
      {person.death_date && (
        <Field label={t('detail.fields.death_date')} value={formatDate(person.death_date)} />
      )}
    </div>
  );
}

function Field({ label, value, hint, mono, fullWidth }: { label: string; value: string; hint?: boolean; mono?: boolean; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-sm text-foreground', mono && 'font-mono', hint && 'text-muted-foreground italic')}>{value}</p>
    </div>
  );
}

function EmptyTabContent({ icon: Icon, title, description, sprint }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  sprint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-medium text-foreground mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground mb-1 max-w-md">{description}</p>
      <p className="text-xs text-muted-foreground/70">
        Implementación prevista para el sprint <span className="font-medium text-primary">{sprint}</span>
      </p>
    </div>
  );
}
