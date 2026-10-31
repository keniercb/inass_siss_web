import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, CheckCircle, XCircle, HandCoins, Hourglass, CalendarClock } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePayment, useUpdatePaymentStatus, useCollectPayment } from '../api/queries';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCUP, cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-submitted',
  paid: 'badge-approved',
  cancelled: 'badge-rejected',
  provitional: 'badge-under_review',
  expired: 'badge-rejected',
};

// Matriz H-16 (Task 69/SGP-53) — transiciones válidas por estado actual.
const TRANSITIONS: Record<string, Array<{ to: string; icon: 'pay' | 'provision' | 'expire' | 'cancel'; variant: 'primary' | 'outline' }>> = {
  pending: [
    { to: 'paid', icon: 'pay', variant: 'primary' },
    { to: 'provitional', icon: 'provision', variant: 'outline' },
    { to: 'cancelled', icon: 'cancel', variant: 'outline' },
  ],
  provitional: [
    { to: 'paid', icon: 'pay', variant: 'primary' },
    { to: 'expired', icon: 'expire', variant: 'outline' },
  ],
  expired: [
    { to: 'cancelled', icon: 'cancel', variant: 'outline' },
  ],
  cancelled: [
    { to: 'paid', icon: 'pay', variant: 'outline' },
  ],
  paid: [],
};

const ICONS = {
  pay: CheckCircle,
  provision: Hourglass,
  expire: CalendarClock,
  cancel: XCircle,
};

export function PaymentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation('payments');
  const { t: tc } = useTranslation('common');
  const can = usePermiso();
  const navigate = useNavigate();
  const { data: payment, isLoading, isError } = usePayment(id);
  const statusMutation = useUpdatePaymentStatus(id);
  const collectMutation = useCollectPayment(id);

  if (isLoading) return <div className="max-w-7xl mx-auto"><p className="text-muted-foreground">{tc('status.loading')}…</p></div>;
  if (isError || !payment) return <div className="max-w-7xl mx-auto text-center py-12"><h1 className="text-xl font-semibold mb-2">{t('detail.not_found')}</h1><button onClick={() => navigate('/pagos')} className="text-primary hover:underline">{t('detail.back_to_list')}</button></div>;

  const personName = payment.pensioner?.person?.full_name ?? '—';
  const canManage = can('payments.manage');
  const currentStatus = payment.status ?? 'pending';
  const transitions = TRANSITIONS[currentStatus] ?? [];

  // Cobro de primera clase: pending o provitional cobran y sellan; paid ya sellado NO (mock lo bloquea con 422)
  const canCollect = currentStatus === 'pending' || currentStatus === 'provitional';

  const paymentFormLabel = payment.payment?.payment_form
    ? (payment.payment.payment_form === 'tarjeta magnetica' ? t('list.filters.payment_form_tarjeta') : t('list.filters.payment_form_nomina'))
    : '—';

  const onTransition = async (to: string) => {
    try {
      await statusMutation.mutateAsync({ status: to });
    } catch { /* el mutation.onError muestra el toast */ }
  };

  const onCollect = async () => {
    // El backend exige agency_id VIVA. Para una UX sencilla, pedimos el ID con un prompt nativo
    // (puede refinarse con un modal dedicado si se quiere mantener el patrón de la app).
    const agencyIdStr = window.prompt(t('collect.agency'), String(payment.agency?.id ?? ''));
    if (!agencyIdStr) return;
    const agencyId = Number(agencyIdStr);
    if (!agencyId) return;
    try {
      await collectMutation.mutateAsync({ agency_id: agencyId });
    } catch { /* el mutation.onError muestra el toast */ }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/pagos')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ChevronLeft className="w-4 h-4" />{t('detail.back_to_list')}</button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{personName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('detail.fields.period')}: <span className="font-mono">{payment.payment?.period}</span> · <span className={cn('badge', STATUS_BADGE[currentStatus] ?? '')}>{t(`list.status.${currentStatus}`)}</span></p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2 justify-end">
            {canCollect && (
              <Button variant="outline" disabled={collectMutation.isPending} onClick={onCollect}>
                <HandCoins className="w-4 h-4" />{t('collect.button')}
              </Button>
            )}
            {transitions.map((tr) => {
              const Icon = ICONS[tr.icon];
              const label = tr.icon === 'pay' ? t('status_change.pay')
                : tr.icon === 'provision' ? t('status_change.provision')
                : tr.icon === 'expire' ? t('status_change.expire')
                : t('status_change.cancel');
              return (
                <Button
                  key={tr.to}
                  variant={tr.variant}
                  disabled={statusMutation.isPending}
                  onClick={() => onTransition(tr.to)}
                >
                  <Icon className="w-4 h-4" />{label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <Field label={t('detail.fields.pensioner')} value={personName} />
          <Field label={t('detail.fields.period')} value={payment.payment?.period ?? '—'} mono />
          <Field label={t('detail.fields.payment_form')} value={paymentFormLabel} />
          <Field label={t('detail.fields.amount')} value={payment.amount != null ? formatCUP(Number(payment.amount)) : '—'} mono />
          <Field label={t('detail.fields.status')} value={t(`list.status.${currentStatus}`)} />
          <Field label={t('detail.fields.bank_control')} value={payment.bank_control ? `#${payment.bank_control.number} · ${payment.bank_control.agency?.name ?? '—'}` : '—'} />
          <Field label={t('detail.fields.frozen_agency')} value={payment.agency ? `${payment.agency.code ?? ''} ${payment.agency.name ?? ''}`.trim() : '—'} />
          <Field label={t('detail.fields.frozen_account')} value={payment.account ?? '—'} mono />
          <Field label={t('detail.fields.paid_at')} value={payment.paid_at ? formatDate(payment.paid_at) : '—'} />
          <Field label={t('detail.fields.paid_on')} value={payment.paid_on ? `${payment.paid_on.code ?? ''} ${payment.paid_on.name ?? ''}`.trim() : '—'} />
          <Field label={t('detail.fields.valid_from')} value={payment.valid_from ? formatDate(payment.valid_from) : '—'} />
          <Field label={t('detail.fields.payment_day')} value={payment.payment_day ? formatDate(payment.payment_day) : '—'} />
          <Field label={t('detail.fields.set_provitional_at')} value={payment.set_provitional_at ? formatDate(payment.set_provitional_at) : '—'} />
          <Field label={t('detail.fields.set_expired_at')} value={payment.set_expired_at ? formatDate(payment.set_expired_at) : '—'} />
          <Field label={t('detail.fields.created_at')} value={payment.created_at ? formatDate(payment.created_at) : '—'} />
          <Field label={t('detail.fields.updated_at')} value={payment.updated_at ? formatDate(payment.updated_at) : '—'} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p><p className={cn('text-sm text-foreground', mono && 'font-mono')}>{value}</p></div>;
}
