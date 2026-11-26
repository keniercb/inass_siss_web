import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Users, Landmark, BarChart3, Download, ArrowRight } from 'lucide-react';

const CARDS = [
  { to: '/reportes/expedientes', icon: FileText, titleKey: 'cases', descKey: 'cases_desc' },
  { to: '/reportes/pensionados', icon: Users, titleKey: 'pensioners', descKey: 'pensioners_desc' },
  { to: '/reportes/controles-bancarios', icon: Landmark, titleKey: 'bank_controls', descKey: 'bank_controls_desc' },
  { to: '/reportes/tablero', icon: BarChart3, titleKey: 'dashboard', descKey: 'dashboard_desc' },
  { to: '/reportes/exportaciones', icon: Download, titleKey: 'exports', descKey: 'exports_desc' },
] as const;

export function ReportsIndexPage() {
  const { t } = useTranslation('reports');
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.to}
            to={card.to}
            className="group bg-card rounded-lg border border-border p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{t(`index.cards.${card.titleKey}`)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(`index.cards.${card.descKey}`)}</p>
          </Link>
        );
      })}
    </div>
  );
}
