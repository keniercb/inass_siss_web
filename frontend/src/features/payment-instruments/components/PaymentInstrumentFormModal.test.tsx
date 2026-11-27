import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { PaymentInstrumentFormModal } from './PaymentInstrumentFormModal';
import { server } from '@/mocks/server';

/**
 * Regresión: el formulario de instrumento de pago mostraba solo "#N" en los
 * select de pensionado y persona beneficiaria (la API no trae full_name a
 * nivel de fila: /pensioners anida person y /people devuelve los componentes
 * sueltos), y el parámetro search no existe en ninguno de los dos endpoints
 * (/people usa q). Al seleccionar, el input quedaba vacío y no quedaba claro
 * que el valor se estableció para el POST.
 *
 * Este test recorre el flujo completo: abrir el select, elegir por nombre
 * compuesto, verificar el valor en el input y capturar el body del POST.
 */

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Localiza el input del SearchSelect a partir del texto del label exterior. */
function selectInputByLabel(labelText: string): HTMLInputElement {
  const label = screen.getByText(labelText);
  const container = label.closest('div');
  const input = container?.querySelector('input[type="text"]');
  if (!input) throw new Error(`input for label "${labelText}" not found`);
  return input as HTMLInputElement;
}

describe('PaymentInstrumentFormModal — selects de pensionado y beneficiaria', () => {
  beforeEach(() => {
    // GET /pensioners no tiene búsqueda por texto: el lote activo se filtra por
    // display en el cliente (UI). El estado activo deja solo al pensionado 1.
    // GET /people filtra con q (fragmentos de nombre) y deceased=false.
  });

  it('compone el nombre del pensionado activo y solo lista activos', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><PaymentInstrumentFormModal onClose={() => {}} /></TestWrapper>);

    const pensionerInput = selectInputByLabel('Pensionado (activo) *');
    await user.click(pensionerInput);

    // El label se compone de person (apellidos primero) — no "#1" solo
    await waitFor(() => {
      expect(screen.getByText('Martínez Josefa')).toBeInTheDocument();
    }, { timeout: 3000 });
    // El pensionado 2 está suspendido: no aparece con status=active
    expect(screen.queryByText('Rodríguez Carlos')).not.toBeInTheDocument();
    // El tag #1 sigue como secundario
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('filtra el pensionado por nombre en el cliente', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><PaymentInstrumentFormModal onClose={() => {}} /></TestWrapper>);

    const pensionerInput = selectInputByLabel('Pensionado (activo) *');
    await user.click(pensionerInput);
    await waitFor(() => {
      expect(screen.getByText('Martínez Josefa')).toBeInTheDocument();
    }, { timeout: 3000 });

    await user.type(pensionerInput, 'mar');
    await waitFor(() => {
      expect(screen.getByText('Martínez Josefa')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('busca la beneficiaria con q y solo personas vivas, con CI como secundario', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><PaymentInstrumentFormModal onClose={() => {}} /></TestWrapper>);

    const beneficiaryInput = selectInputByLabel('Persona beneficiaria *');
    await user.click(beneficiaryInput);
    // q=gar: María Elena García (viva, CI 92051047891); Juan Pérez García
    // (fallecido) NO aparece por deceased=false
    await user.type(beneficiaryInput, 'gar');
    await waitFor(() => {
      expect(screen.getByText('García Suárez María Elena')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.queryByText('Pérez García Juan')).not.toBeInTheDocument();
    expect(screen.getByText('92051047891')).toBeInTheDocument();
  });

  it('al seleccionar establece el valor y el POST lleva pensioner_id, beneficiary_person_id y type', async () => {
    const user = userEvent.setup();
    let captured: Record<string, unknown> | undefined;
    server.use(
      http.post('*/api/v1/payment-instruments', async ({ request }) => {
        captured = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ data: { id: 99 } }, { status: 201 });
      }),
    );

    const onClose = vi.fn();
    render(<TestWrapper><PaymentInstrumentFormModal onClose={onClose} /></TestWrapper>);

    // Pensionado: abrir, esperar opciones, elegir por nombre
    const pensionerInput = selectInputByLabel('Pensionado (activo) *');
    await user.click(pensionerInput);
    await waitFor(() => {
      expect(screen.getByText('Martínez Josefa')).toBeInTheDocument();
    }, { timeout: 3000 });
    await user.click(screen.getByText('Martínez Josefa'));

    // El input muestra el nombre elegido (antes quedaba vacío — bug visual)
    await waitFor(() => {
      expect(pensionerInput).toHaveValue('Martínez Josefa');
    });

    // Beneficiaria: escribir q, esperar, elegir
    const beneficiaryInput = selectInputByLabel('Persona beneficiaria *');
    await user.click(beneficiaryInput);
    await user.type(beneficiaryInput, 'gar');
    await waitFor(() => {
      expect(screen.getByText('García Suárez María Elena')).toBeInTheDocument();
    }, { timeout: 3000 });
    await user.click(screen.getByText('García Suárez María Elena'));
    await waitFor(() => {
      expect(beneficiaryInput).toHaveValue('García Suárez María Elena');
    });

    // El botón Crear se habilita con los 3 campos listos
    const createButton = screen.getByRole('button', { name: 'Crear' });
    expect(createButton).not.toBeDisabled();
    await user.click(createButton);

    // El POST al backend lleva los ids seleccionados
    await waitFor(() => {
      expect(captured).toBeDefined();
    });
    expect(captured).toMatchObject({
      pensioner_id: 1,
      beneficiary_person_id: 6,
      type: 'provisional_payment',
    });
    expect(onClose).toHaveBeenCalled();
  });
});
