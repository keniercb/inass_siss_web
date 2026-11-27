import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Link2, GitBranch } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePaymentInstrument } from '../api/queries';
import type { InstrumentStatus } from '../api/schemas';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCUP, cn } from '@/lib/utils';
import { AssociatePaymentModal } from '../components/AssociatePaymentModal';
import { PaymentInstrumentTransitionModal } from '../components/PaymentInstrumentTransitionModal';

const STATUS_BADGE: Record<InstrumentStatus, string> = {
  created: 'badge-submitted',
  pending: 'badge-under_review',
  paid: 'badge-approved',
  expired: 'badge-rejected',
  cancelled: 'badge-deceased',
};

const LEDGER_STATUS_BADGE: Record<string, string> = {
  pending: 'badge-submitted',
  provitional: 'badge-under_review',
  paid: 'badge-approved',
  expired: 'badge-rejected',
  cancelled: 'badge-rejected',
};

export function PaymentInstrumentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('payment-instruments');
  const { t: tc } = useTranslation('common');
  const { t: tp } = useTranslation('pensioners');
  const can = usePermiso();
  const navigate = useNavigate();

  const [associateOpen, setAssociateOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);

  const { data: instrument, isLoading, isError } = usePaymentInstrument(id);
  const canManage = can('payments.manage');

  if (isLoading) {
    return <div className="max-w-7xl mx-auto"><p className="text-muted-foreground">{tc('status.loading')}…</p></div>;
  }
  if (isError || !instrument) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <h1 className="text-xl font-semibold text-foreground mb-2">{t('detail.not_found')}</h1>
        <button onClick={() => navigate('/instrumentos')} className="text-primary hover:underline">{t('detail.back_to_list')}</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/instrumentos')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="w-4 h-4" />{t('detail.back_to_list')}
      </button>

      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground font-mono">#{instrument.id}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {instrument.pensioner?.person?.full_name ?? '—'} · <span className="font-mono">{formatCUP(Number(instrument.amount))}</span> · <span className={`badge ${STATUS_BADGE[instrument.status] ?? ''}`}>{t(`list.status.${instrument.status}`)}</span>
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {instrument.status === 'created' && (
              <Button variant="outline" onClick={() => setAssociateOpen(true)}>
                <Link2 className="w-4 h-4" />{t('detail.actions.associate')}
              </Button>
            )}
            <Button variant="outline" onClick={() => setTransitionOpen(true)}>
              <GitBranch className="w-4 h-4" />{t('detail.actions.transition')}
            </Button>
          </div>
        )}
      </div>

      {/* Ficha */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        <Field label={t('detail.fields.pensioner')} value={instrument.pensioner?.person?.full_name ?? '—'} />
        <Field
          label={t('detail.fields.pensioner_status')}
          value={instrument.pensioner?.status ? tp(`list.status.${instrument.pensioner.status}`) : '—'}
        />
        <Field label={t('detail.fields.beneficiary')} value={instrument.beneficiary?.full_name ?? '—'} />
        <Field label={t('detail.fields.amount')} value={formatCUP(Number(instrument.amount))} mono />
        <Field label={t('detail.fields.type')} value={instrument.type ? t(`list.type.${instrument.type}`) : '—'} />
        <Field label={t('detail.fields.status')} value={t(`list.status.${instrument.status}`)} />
        <Field label={t('detail.fields.set_expired_at')} value={instrument.set_expired_at ? formatDate(instrument.set_expired_at) : '—'} />
        <Field label={t('detail.fields.paid_at')} value={instrument.paid_at ? formatDate(instrument.paid_at) : '—'} />
        <Field label={t('detail.fields.created_at')} value={instrument.created_at ? formatDate(instrument.created_at) : '—'} />
      </div>

      {/* Pagos vinculados */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-2 bg-muted text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('detail.associated_payments.title')}
        </div>
        {instrument.associated_payments.length === 0 ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">{t('detail.associated_payments.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">{t('detail.associated_payments.columns.id')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('detail.associated_payments.columns.period')}</th>
                <th className="text-right px-4 py-2 font-medium">{t('detail.associated_payments.columns.amount')}</th>
                <th className="text-left px-4 py-2 font-medium">{t('detail.associated_payments.columns.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {instrument.associated_payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">#{p.id}</td>
                  <td className="px-4 py-2 font-mono">{p.period}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatCUP(Number(p.amount))}</td>
                  <td className="px-4 py-2">
                    <span className={cn('badge', LEDGER_STATUS_BADGE[p.status] ?? '')}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {associateOpen && <AssociatePaymentModal instrumentId={id} onClose={() => setAssociateOpen(false)} />}
      {transitionOpen && instrument && (
        <PaymentInstrumentTransitionModal instrumentId={id} currentStatus={instrument.status} onClose={() => setTransitionOpen(false)} />
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-sm font-medium text-foreground mt-1', mono && 'font-mono')}>{value}</div>
    </div>
  );
}
