import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TopNavbar } from './components/TopNavbar';
import { Sidebar } from './components/Sidebar';
import { useAuthStore } from '@/store/auth-store';
import { http } from '@/lib/http';
import type { AuthUser } from '@/store/auth-store';

interface AuthMeResponse {
  data: AuthUser;
}

/**
 * AppLayout — Layout autenticado.
 * Grid CSS: TopNavbar (full-width 56px) + Sidebar (colapsable) + Main (1fr) + Footer (32px).
 * El ToastContainer se renderiza fuera del layout en main.tsx.
 *
 * Al montar, valida el token contra /auth/me. Si 401, el interceptor de http.ts
 * limpia la sesión y redirige a /login?expired=1.
 */
export function AppLayout() {
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  // Validar el token al montar el layout (si hay token)
  const { isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await http.get<AuthMeResponse>('/auth/me');
      return response.data;
    },
    enabled: !!token,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 min — no re-validar constantemente
  });

  // Si /auth/me falla (401 manejado por interceptor), el store ya se limpió.
  // Solo necesitamos redirigir si isError y aún estamos aquí.
  useEffect(() => {
    if (isError && !useAuthStore.getState().token) {
      navigate('/login?expired=1', { replace: true });
    }
  }, [isError, navigate]);

  // Actualizar el user del store con la respuesta de /auth/me (cuando llega)
  // (Lo hacemos vía el hook setSession para no causar re-renders innecesarios)
  // Nota: la respuesta se cachea en TanStack Query, no es necesario actualizar el store
  // si ya tenemos el user del login. Solo si el backend cambió el user (ej. nuevos roles).

  return (
    <div className="app-layout">
      <TopNavbar />
      <Sidebar />
      <main className="app-layout__main">
        <Outlet />
      </main>
      <footer className="app-layout__footer flex items-center justify-center text-xs text-muted-foreground border-t border-border bg-white">
        SGP v1.0.0 — Ministerio de Trabajo de Cuba · INASS / SSIP
      </footer>
    </div>
  );
}
