import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, CheckCircle, XCircle, HandCoins } from 'lucide-react';
import { usePermiso } from '@/hooks/use-permiso';
import { usePayment, useUpdatePaymentStatus, useCollectPayment } from '../api/queries';
import { Button } from '@/components/ui/Button';
import { formatDate, formatCUP, cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, string> = { pending: 'badge-submitted', paid: 'badge-approved', cancelled: 'badge-rejected', provitional: 'badge-under_review', expired: 'badge-rejected' };

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
  const isPending = payment.status === 'pending';
  const canCollect = payment.status === 'pending' || payment.status === 'provitional' || payment.status === 'paid';

  return (
    <div className="max-w-7xl mx-auto">
      <button onClick={() => navigate('/pagos')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"><ChevronLeft className="w-4 h-4" />{t('detail.back_to_list')}</button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{personName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('detail.fields.period')}: <span className="font-mono">{payment.payment?.period}</span> · <span className={cn('badge', STATUS_BADGE[payment.status ?? 'pending'] ?? '')}>{t(`list.status.${payment.status}`)}</span></p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            {canCollect && (
              <Button variant="outline" disabled={collectMutation.isPending} onClick={async () => { try { await collectMutation.mutateAsync({ agency_id: 1 }); } catch { /* toast */ } }}><HandCoins className="w-4 h-4" />{t('collect.button')}</Button>
            )}
            {isPending && (
              <>
                <Button variant="outline" onClick={async () => { try { await statusMutation.mutateAsync({ status: 'paid' }); } catch { /* toast */ } }}><CheckCircle className="w-4 h-4" />{t('status_change.pay')}</Button>
                <Button variant="outline" onClick={async () => { try { await statusMutation.mutateAsync({ status: 'cancelled' }); } catch { /* toast */ } }}><XCircle className="w-4 h-4" />{t('status_change.cancel')}</Button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <Field label={t('detail.fields.pensioner')} value={personName} />
          <Field label={t('detail.fields.period')} value={payment.payment?.period ?? '—'} mono />
          <Field label={t('detail.fields.amount')} value={payment.amount != null ? formatCUP(Number(payment.amount)) : '—'} mono />
          <Field label={t('detail.fields.status')} value={t(`list.status.${payment.status}`)} />
          <Field label={t('detail.fields.paid_at')} value={payment.paid_at ? formatDate(payment.paid_at) : '—'} />
          <Field label={t('detail.fields.bank_control')} value={payment.bank_control ? `#${payment.bank_control.number} · ${payment.bank_control.agency?.name ?? '—'}` : '—'} />
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
