import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './i18n';
import './index.css';
import { queryClient } from './lib/query-client';
import { router } from './routes/router';
import { ToastContainer } from './components/ui/Toast';

async function bootstrap() {
  // Activar MSW en dev por defecto (opt-out con VITE_ENABLE_MSW=false)
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW !== 'false') {
    const { startMockWorker } = await import('./mocks/browser');
    await startMockWorker();
  }

  function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastContainer />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    );
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
