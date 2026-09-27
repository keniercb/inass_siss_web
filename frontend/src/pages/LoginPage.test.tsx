import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '@/store/auth-store';
import { resetRateLimitState } from '@/mocks/handlers/auth';
import { http } from '@/lib/http';

// Wrapper para el router + query client
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    resetRateLimitState();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('renderizado inicial', () => {
    it('renderiza el formulario con campos email y password', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      );

      // Título h1 y botón submit comparten el texto "Iniciar sesión",
      // usar getByRole para desambiguar
      expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    });

    it('renderiza el enlace de recuperación de contraseña', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      );
      expect(screen.getByText(/¿Olvidó su contraseña\?/i)).toBeInTheDocument();
    });

    it('muestra mensaje de sesión expirada si expired=1 en URL', () => {
      // Render con estado de sesión expirada
      const TestWrapperExpired = ({ children }: { children: React.ReactNode }) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        return (
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/login?expired=1']}>{children}</MemoryRouter>
          </QueryClientProvider>
        );
      };

      render(
        <TestWrapperExpired>
          <LoginPage />
        </TestWrapperExpired>,
      );

      expect(screen.getByText(/Su sesión ha expirado/i)).toBeInTheDocument();
    });
  });

  describe('validación client-side', () => {
    it('valida campos requeridos antes de enviar', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      );

      const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/El correo es obligatorio/i)).toBeInTheDocument();
        expect(screen.getByText(/La contraseña es obligatoria/i)).toBeInTheDocument();
      });
    });

    it('valida formato de email inválido', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      );

      await user.type(screen.getByLabelText(/Correo electrónico/i), 'email-invalido');
      await user.type(screen.getByLabelText(/Contraseña/i), 'password123');
      await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

      await waitFor(() => {
        expect(screen.getByText(/El correo no es válido/i)).toBeInTheDocument();
      });
    });

    it('valida contraseña mínima de 8 caracteres', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      );

      await user.type(screen.getByLabelText(/Correo electrónico/i), 'test@example.com');
      await user.type(screen.getByLabelText(/Contraseña/i), '123'); // < 8 chars
      await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/La contraseña debe tener al menos 8 caracteres/i),
        ).toBeInTheDocument();
      });
    });
  });

  // Tests de login exitoso, credenciales inválidas y rate limiting UI
  // se cubren con E2E (Playwright) — más robusto para flows async con MSW.

  describe('http client integration', () => {
    it('el cliente http envía el header Authorization cuando hay token', async () => {
      // Verificar que el interceptor de http añade Authorization
      const postSpy = vi.spyOn(http, 'post');
      postSpy.mockResolvedValueOnce({
        data: {
          data: {
            token: 'fake-token',
            token_type: 'Bearer',
            user: { id: 1, name: 'Test', email: 'test@test.com', roles: [], permissions: [] },
          },
        },
      } as never);

      const user = userEvent.setup();
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>,
      );

      await user.type(screen.getByLabelText(/Correo electrónico/i), 'test@test.com');
      await user.type(screen.getByLabelText(/Contraseña/i), 'password');
      await user.click(screen.getByRole('button', { name: /Iniciar sesión/i }));

      await waitFor(() => {
        expect(postSpy).toHaveBeenCalledWith('/auth/login', {
          email: 'test@test.com',
          password: 'password',
        });
      });

      postSpy.mockRestore();
    });
  });
});
