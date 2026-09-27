import { Outlet } from 'react-router-dom';
import { TopNavbar } from './components/TopNavbar';
import { Sidebar } from './components/Sidebar';

/**
 * AppLayout — Layout autenticado.
 * Grid CSS: TopNavbar (full-width 56px) + Sidebar (256px) + Main (1fr) + Footer (32px).
 * El ToastContainer se renderiza fuera del layout en main.tsx.
 */
export function AppLayout() {
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
