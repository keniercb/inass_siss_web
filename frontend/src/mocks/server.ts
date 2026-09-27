import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server para tests de integración (Vitest) y E2E (Playwright).
 * Intercepta todos los requests HTTP del cliente Axios.
 *
 * Uso en tests:
 *   import { server } from '@/mocks/server';
 *   beforeAll(() => server.listen());
 *   afterEach(() => server.resetHandlers());
 *   afterAll(() => server.close());
 */
export const server = setupServer(...handlers);
