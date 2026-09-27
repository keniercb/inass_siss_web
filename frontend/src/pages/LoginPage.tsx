import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Lock, Mail, LogIn } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { AuthUser } from '@/store/auth-store';

// Schema Zod — único source of truth para validación
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'email_required')
    .email('email_invalid'),
  password: z
    .string()
    .min(1, 'password_required')
    .min(8, 'password_min'),
});

type LoginInput = z.infer<typeof loginSchema>;

// Respuesta del backend SGP (envolvente RF-API-002)
interface LoginApiResponse {
  data: {
    token: string;
    token_type: string;
    user: AuthUser;
  };
}

interface LoginError {
  response?: {
    status?: number;
    statusText?: string;
    data?: { message?: string; errors?: Record<string, string[]> };
    headers?: { 'retry-after'?: string };
  };
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 30; // mock: 30s. Backend real: 5 minutos.

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const login = useAuthStore((s) => s.login);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired') === '1';

  // Página a la que redirigir tras login exitoso
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  // Estado de rate limiting (no persistido — solo en componente)
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);

  // Countdown cuando está bloqueado
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockSeconds]);

  const isLocked = lockSeconds > 0;

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation<LoginApiResponse, LoginError, LoginInput>({
    mutationFn: async (input) => {
      const response = await http.post<LoginApiResponse>('/auth/login', input);
      return response.data;
    },
    onSuccess: (data) => {
      // Resetear contador de intentos fallidos
      setFailedAttempts(0);
      setLockSeconds(0);
      login(data.data.token, data.data.user);
      toast.success(tCommon('status.success'));
      navigate(from, { replace: true });
    },
    onError: (error) => {
      const status = error.response?.status;

      if (status === 401) {
        // Credenciales inválidas
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        form.setError('password', { message: t('login.errors.invalid_credentials') });

        if (newAttempts >= MAX_FAILED_ATTEMPTS) {
          setLockSeconds(LOCK_DURATION_SECONDS);
          toast.error(t('login.errors.account_locked'));
        } else {
          const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
          toast.warning(`Intentos restantes: ${remaining} de ${MAX_FAILED_ATTEMPTS}`);
        }
      } else if (status === 429) {
        // Rate limited por el backend
        const retryAfter = parseInt(error.response?.headers?.['retry-after'] ?? '30', 10);
        setLockSeconds(retryAfter);
        toast.error(t('login.errors.rate_limited', { minutes: Math.ceil(retryAfter / 60) }));
      } else if (status === 422) {
        // Errores de validación del backend se mapean a campos
        const errors = error.response?.data?.errors;
        if (errors) {
          Object.entries(errors).forEach(([field, messages]) => {
            if (messages.length > 0) {
              form.setError(field as keyof LoginInput, { message: messages[0] });
            }
          });
        }
      } else {
        toast.error(tCommon('errors.server'));
      }
    },
  });

  const onSubmit = form.handleSubmit((input) => {
    if (isLocked) return;
    void loginMutation.mutate(input);
  });

  // Manejar errores de backend (422) — los mapeamos a campos del formulario
  const formatError = useCallback(
    (message: string | undefined) => {
      if (!message) return undefined;
      // El mensaje es una key i18n como 'email_required' o mensaje directo
      if (message.includes('_')) return t(`login.validation.${message}`);
      return message;
    },
    [t],
  );

  return (
    <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
      {expired && (
        <div className="mb-4 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm text-foreground">
          {t('session.expired')}
        </div>
      )}

      {isLocked && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-center gap-2">
          <Lock className="w-4 h-4" />
          <span>
            {t('login.errors.account_locked')}
            {' '}
            <span className="font-mono font-medium">
              {Math.floor(lockSeconds / 60)}:{String(lockSeconds % 60).padStart(2, '0')}
            </span>
          </span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{t('login.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('login.subtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            {t('login.email')}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('login.email_placeholder')}
              error={!!form.formState.errors.email}
              className="pl-9"
              disabled={isLocked}
              {...form.register('email')}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {formatError(form.formState.errors.email.message)}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            {t('login.password')}
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('login.password_placeholder')}
              error={!!form.formState.errors.password}
              className="pl-9"
              disabled={isLocked}
              {...form.register('password')}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {formatError(form.formState.errors.password.message)}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loginMutation.isPending || isLocked}
          className={cn('w-full')}
        >
          {loginMutation.isPending ? (
            <>
              <LogIn className="w-4 h-4 animate-pulse" />
              {t('login.submitting')}
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              {t('login.submit')}
            </>
          )}
        </Button>

        <div className="text-center">
          <a href="/recuperar-contrasena" className="text-xs text-primary hover:underline">
            {t('login.forgot_password')}
          </a>
        </div>

        {/* Ayuda para desarrollo — mostrar credenciales mock */}
        {import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true' && (
          <details className="mt-4 p-3 rounded-md bg-muted/50 text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Credenciales de prueba (MSW activo)
            </summary>
            <div className="mt-2 space-y-1 text-muted-foreground">
              <p><code>admin@sgp.local</code> / password</p>
              <p><code>director@sgp.local</code> / password</p>
              <p><code>specialist@sgp.local</code> / password</p>
              <p><code>operator@sgp.local</code> / password</p>
              <p><code>auditor@sgp.local</code> / password</p>
            </div>
          </details>
        )}
      </form>
    </div>
  );
}
