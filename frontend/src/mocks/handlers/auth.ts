import { http, HttpResponse } from 'msw';
import { MOCK_CREDENTIALS, MOCK_USERS, findUserByToken, findUserByEmail } from '@/test/fixtures/users';

const API_BASE = 'http://localhost:8000/api/v1';

/**
 * Handlers MSW para los endpoints de auth.
 * Simulan el comportamiento del backend SGP para desarrollo y tests.
 *
 * Comportamiento simulado:
 * - POST /auth/login: valida credenciales contra MOCK_CREDENTIALS
 *   * 200 si email existe y password = 'password'
 *   * 401 si email existe pero password incorrecto
 *   * 422 si email no es válido o falta password
 *   * 429 después de 5 intentos fallidos (rate limiting)
 * - GET /auth/me: valida token Bearer y retorna el user
 *   * 200 con user si token es válido
 *   * 401 si token falta o es inválido
 * - POST /auth/logout: revoca el token (simulado)
 *   * 200 siempre (incluso si token es inválido, el backend real también lo hace)
 */

// Estado en memoria para rate limiting (reset entre tests)
let failedAttempts = 0;
let lockUntil: Date | null = null;

export function resetRateLimitState() {
  failedAttempts = 0;
  lockUntil = null;
}

export const authHandlers = [
  // POST /auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    // Verificar si está bloqueado por rate limiting
    if (lockUntil && new Date() < lockUntil) {
      const secondsLeft = Math.ceil((lockUntil.getTime() - Date.now()) / 1000);
      return HttpResponse.json(
        { message: 'Too many login attempts. Please try again in a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(secondsLeft) } },
      );
    }

    const body = (await request.json()) as { email?: string; password?: string };

    // Validación de campos
    if (!body.email || !body.password) {
      return HttpResponse.json(
        {
          message: 'The email field is required. (and 1 more error)',
          errors: {
            email: body.email ? [] : ['The email field is required.'],
            password: body.password ? [] : ['The password field is required.'],
          },
        },
        { status: 422 },
      );
    }

    // Validar email con regex básica
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return HttpResponse.json(
        {
          message: 'The email field must be a valid email address.',
          errors: { email: ['The email field must be a valid email address.'] },
        },
        { status: 422 },
      );
    }

    // Buscar usuario por email
    const user = findUserByEmail(body.email);

    if (!user || body.password !== 'password') {
      // Credenciales inválidas
      failedAttempts += 1;
      if (failedAttempts >= 5) {
        // Bloquear por 5 minutos (simulado: 30 segundos para tests)
        lockUntil = new Date(Date.now() + 30 * 1000);
        return HttpResponse.json(
          { message: 'Too many login attempts. Account locked.' },
          { status: 429, headers: { 'Retry-After': '30' } },
        );
      }
      return HttpResponse.json(
        { message: 'Invalid credentials.' },
        { status: 401 },
      );
    }

    // Login exitoso — resetear contador
    failedAttempts = 0;
    lockUntil = null;

    // Envelope según RF-API-002: { data: { token, token_type, user } }
    return HttpResponse.json({
      data: {
        token: user.token,
        token_type: user.token_type,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
        },
      },
    });
  }),

  // GET /auth/me
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { message: 'Unauthenticated.' },
        { status: 401 },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const user = findUserByToken(token);

    if (!user) {
      return HttpResponse.json(
        { message: 'Unauthenticated.' },
        { status: 401 },
      );
    }

    // Envelope: { data: User }
    return HttpResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
      },
    });
  }),

  // POST /auth/logout
  http.post(`${API_BASE}/auth/logout`, () => {
    // El backend real siempre retorna 200 incluso con token inválido (Sanctum)
    return HttpResponse.json({ message: 'Token revoked.' });
  }),
];

// Exportar fixtures para uso en tests
export { MOCK_USERS, MOCK_CREDENTIALS };
