import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/DropdownMenu';
import { useUIStore } from '@/store/ui-store';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const setLocale = useUIStore((s) => s.setLocale);
  const current = (i18n.language ?? 'es-CU') as SupportedLanguage;

  const changeLanguage = (lang: SupportedLanguage) => {
    void i18n.changeLanguage(lang);
    setLocale(lang);
    localStorage.setItem('sgp.lang', lang);
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
