import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

export function UserDropdown() {
  const { user, logout } = useAuthStore();
  const roles = user?.roles ?? [];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation('common');
  const toast = useToast();

  // Iniciales del usuario para el avatar fallback
  const initials = `${user?.name?.[0] ?? ''}${user?.email?.[0] ?? ''}`.toUpperCase();
  const primaryRole = roles?.[0] ?? '—';

  const logoutMutation = useMutation({
    mutationFn: () => http.post('/auth/logout'),
    onSuccess: () => {
      logout();
      queryClient.clear();
      navigate('/login', { replace: true });
      toast.success(t('user.logout'));
    },
    onError: () => {
      // Aunque el backend falle, limpiamos el estado local
      logout();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 px-2 py-1 rounded-md',
            'hover:bg-muted transition-colors',
          )}
        >
          <Avatar className="border">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{primaryRole}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      }
    >
      <DropdownMenuLabel>
        <p className="font-medium text-sm leading-tight">{user?.name}</p>
        <p className="text-xs text-muted-foreground leading-tight">{user?.email}</p>
        <p className="text-xs text-primary mt-1 font-medium uppercase tracking-wide">
          {primaryRole}
        </p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate('/perfil')}>
        <User className="w-4 h-4" /> {t('user.my_profile')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate('/configuracion')}>
        <Settings className="w-4 h-4" /> {t('user.settings')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        className="text-destructive hover:bg-destructive/10"
      >
        <LogOut className="w-4 h-4" /> {t('user.logout')}
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
