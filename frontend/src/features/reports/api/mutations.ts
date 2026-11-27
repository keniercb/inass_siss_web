import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import { useApiError } from '@/lib/api-error';
import type { ReportExportRun, CreateExportRunInput } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/report-exports — solicitar una exportación (202 async)
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateExportRun() {
  const qc = useQueryClient();
  const { t } = useTranslation('reports');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (input: CreateExportRunInput) => {
      // Filtrar undefined para no enviar campos vacíos.
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined && v !== '' && v !== null) body[k] = v;
      }
      const r = await http.post<{ data: ReportExportRun }>('/report-exports', body);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports', 'exports'] });
      toast.success(t('export_create.success'));
    },
    onError: (err: unknown) => {
      // 422 (p. ej. report+format inválido, filtros incoherentes) → error con body.message.
      // 403 (sin reports.export) → error con body.message.
      toastApiError(err, { title: t('export_create.error'), silent422: true });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/report-exports/{id}/download — descargar el archivo (blob)
// 409 si la corrida aún no está `completed`.
// ─────────────────────────────────────────────────────────────────────────────

export function useDownloadExportRun() {
  const { t } = useTranslation('reports');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const r = await http.get(`/report-exports/${id}/download`, { responseType: 'blob' });
      return r.data as Blob;
    },
    onSuccess: (blob, id) => {
      // Generar URL y disparar descarga en el navegador.
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // El backend provee Content-Disposition; si no llegó, sintetizamos un nombre.
      a.download = `report-export-${id}.bin`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Liberar la URL diferida: darle un respiro al navegador para iniciar la descarga.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t('download.success'));
    },
    onError: (err: unknown) => {
      // 409: la corrida aún no está completed. El helper parsea el Blob del body
      // (axios responseType:blob) async y muestra el `message` del backend si vino.
      toastApiError(err, { title: t('download.error'), fallbackDetail: t('download.not_ready') });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/reports/case-fichas/{id} — ficha del expediente en PDF
// GET /api/v1/reports/pensioner-fichas/{id} — ficha del pensionado en PDF
// ─────────────────────────────────────────────────────────────────────────────

export function useDownloadCaseFicha() {
  const { t } = useTranslation('reports');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const r = await http.get(`/reports/case-fichas/${id}`, {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      return r.data as Blob;
    },
    onSuccess: (blob, id) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expediente-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t('ficha.success'));
    },
    onError: (err: unknown) => {
      // 404: registro inexistente. El helper muestra el `message` del body si vino.
      toastApiError(err, { title: t('ficha.error'), fallbackDetail: t('ficha.not_found') });
    },
  });
}

export function useDownloadPensionerFicha() {
  const { t } = useTranslation('reports');
  const toast = useToast();
  const { toastApiError } = useApiError();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const r = await http.get(`/reports/pensioner-fichas/${id}`, {
        responseType: 'blob',
        headers: { Accept: 'application/pdf' },
      });
      return r.data as Blob;
    },
    onSuccess: (blob, id) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pensionado-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t('ficha.success'));
    },
    onError: (err: unknown) => {
      toastApiError(err, { title: t('ficha.error'), fallbackDetail: t('ficha.not_found') });
    },
  });
}
