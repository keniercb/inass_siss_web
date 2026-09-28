import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * MSW worker para desarrollo (navegador).
 * Solo se activa en dev mode (VITE_ENABLE_MSW=true).
 *
 * En producción NO se carga — el tráfico va al backend real.
 */
export const worker = setupWorker(...handlers);

/**
 * Inicializa MSW en dev mode.
 * Llamado desde main.tsx condicionalmente.
 */
export async function startMockWorker() {
  if (!import.meta.env.DEV) {
    console.warn('[MSW] startMockWorker llamado en producción — no debería ejecutarse');
    return;
  }
  await worker.start({
    onUnhandledRequest: 'bypass', // requests no matcheados pasan al backend real
    quiet: false,
  });
  console.info('[MSW] Mock Service Worker iniciado — usando handlers simulados');
}
