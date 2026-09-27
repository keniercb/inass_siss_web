import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Tipo del usuario autenticado (enriquecido con roles y permisos)
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
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
        // admin tiene todos los permisos
        if (user.roles.includes('admin')) return true;
        return user.permissions.includes(permission);
      },

      hasRole: (role) => {
        const user = get().user;
        return user?.roles.includes(role) ?? false;
      },
    }),
    {
      name: 'sgp-auth',
      storage: createJSONStorage(() => sessionStorage), // sessionStorage por hardening (ADR-FE-08)
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
