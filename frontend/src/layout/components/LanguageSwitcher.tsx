import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { useChangeLanguage } from '@/features/auth/api/mutations';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

// Task 72/SGP-56: mapeo del locale del frontend (3 valores) al enum del backend (es|en).
// El backend solo acepta 'es' | 'en' para el campo User.language (D-110).
const FRONTEND_TO_BACKEND: Record<SupportedLanguage, 'es' | 'en'> = {
  'es-CU': 'es',
  'es-ES': 'es',
  'en-US': 'en',
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const setLocale = useUIStore((s) => s.setLocale);
  const token = useAuthStore((s) => s.token);
  const changeLanguageMutation = useChangeLanguage();
  const current = (i18n.language ?? 'es-CU') as SupportedLanguage;

  const changeLanguage = (lang: SupportedLanguage) => {
    // 1. Frontend: cambia el locale de i18n + persiste en localStorage + UI store.
    void i18n.changeLanguage(lang);
    setLocale(lang);
    localStorage.setItem('sgp.lang', lang);
    // 2. Backend (Task 72/SGP-56): si hay sesión autenticada, persiste el idioma en
    //    la cuenta del usuario. El middleware SetAppLocale aplica el cambio a la
    //    próxima solicitud (envolvente de mensajes en ese idioma). Fire-and-forget:
    //    no bloquea la UI; el mutation muestra toast de éxito/error.
    if (token) {
      changeLanguageMutation.mutate(FRONTEND_TO_BACKEND[lang]);
    }
  };

  return (
    <DropdownMenu
      align="end"
      trigger={
        <button
          type="button"
          className={cn(
            'px-2 py-1.5 rounded-md hover:bg-muted',
            'text-sm font-medium flex items-center gap-1.5',
          )}
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{current}</span>
        </button>
      }
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <DropdownMenuItem
          key={lang}
          onClick={() => changeLanguage(lang)}
          className={lang === current ? 'bg-muted font-medium' : ''}
        >
          {(() => {
            const labels: Record<SupportedLanguage, string> = {
              'es-CU': 'Español (Cuba)',
              'es-ES': 'Español (España)',
              'en-US': 'English (US)',
            };
            return labels[lang];
          })()}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
    </DropdownMenu>
  );
}
