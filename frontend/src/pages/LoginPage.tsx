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

interface LoginApiResponse {
  data: {
    token: string;
    token_type: string;
    user: {
      id: number;
      name: string;
      email: string;
      roles: string[];
      permissions: string[];
    };
  };
}

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const login = useAuthStore((s) => s.login);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired') === '1';

  // Página a la que redirigir tras login exitoso:
  // - Si el usuario fue redirigido desde una ruta protegida, volver a esa ruta
  // - Si accedió directamente a /login, ir al dashboard
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await http.post<LoginApiResponse>('/auth/login', input);
      return response.data;
    },
    onSuccess: (data) => {
      login(data.data.token, data.data.user);
      toast.success(tCommon('status.success'));
      // Redirigir a la página origen o al dashboard por defecto
      navigate(from, { replace: true });
    },
    onError: (error: { response?: { status?: number; data?: { message?: string } } }) => {
      const status = error.response?.status;
      if (status === 401) {
        form.setError('password', { message: t('login.errors.invalid_credentials') });
      } else if (status === 422) {
        // Errores de validación del backend se mapean a campos
        // (en este caso el schema Zod ya debería capturarlos)
      } else if (status === 429) {
        toast.error(t('login.errors.rate_limited', { minutes: 5 }));
      } else {
        toast.error(tCommon('errors.server'));
      }
    },
  });

  const onSubmit = form.handleSubmit((input) => {
    void loginMutation.mutate(input);
  });

  return (
    <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
      {expired && (
        <div className="mb-4 p-3 rounded-md bg-warning/10 border border-warning/30 text-sm text-warning-foreground">
          {t('session.expired')}
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
              {...form.register('email')}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {t(`login.validation.${form.formState.errors.email.message}`)}
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
              {...form.register('password')}
            />
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {t(`login.validation.${form.formState.errors.password.message}`)}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loginMutation.isPending}
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
      </form>
    </div>
  );
}
