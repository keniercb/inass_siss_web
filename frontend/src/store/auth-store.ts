import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { components } from '@/types/api';

// Tipo User generado desde OpenAPI (auth/me + auth/login response)
export type AuthUser = components['schemas']['User'];

// Type guard para verificar que el objeto User tiene todos los campos requeridos
// (los tipos generados marcan todo como opcional, pero en runtime siempre están presentes)
export function isAuthUser(obj: unknown): obj is Required<AuthUser> {
  if (typeof obj !== 'object' || obj === null) return false;
  const u = obj as Record<string, unknown>;
  return (
    typeof u.id === 'number' &&
    typeof u.name === 'string' &&
    typeof u.email === 'string' &&
    Array.isArray(u.roles) &&
    Array.isArray(u.permissions)
  );
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setSession: (user: AuthUser) => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),

      setSession: (user) => set({ user }),

      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        // admin tiene todos los permisos implícitamente
        if (user.roles?.includes('admin')) return true;
        return user.permissions?.includes(permission) ?? false;
      },

      hasRole: (role) => {
        const user = get().user;
        return user?.roles?.includes(role) ?? false;
      },
    }),
    {
      name: 'sgp-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
