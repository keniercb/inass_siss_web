import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { components } from '@/types/api';
import type { CreateCaseInput, UpdateCaseInput, SalaryRecordInput, ServiceRecordInput, WorkCycleInput, IncomeConceptRecordInput, EntitledRelativeInput, TransitionInput } from '../schemas/pension-case.schema';
import type { AxiosError } from 'axios';

type PensionCase = components['schemas']['PensionCase'];
type PensionCaseHistory = components['schemas']['PensionCaseHistory'];
interface ApiResponse<T> { data: T; }

export function useCreateCase() {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: CreateCaseInput) => {
      const r = await http.post<ApiResponse<PensionCase>>('/pension-cases', input);
      return r.data.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'list'] }); toast.success(t('create.success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(t('create.error'), allMessages.join(' · '));
        return;
      }
      toast.error(t('create.error'));
    },
  });
}

export function useUpdateCase() {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number | string; input: UpdateCaseInput }) => {
      const r = await http.put<ApiResponse<PensionCase>>(`/pension-cases/${id}`, input);
      return r.data.data;
    },
    onSuccess: (data, { id }) => {
      qc.invalidateQueries({ queryKey: ['pension-cases', 'list'] });
      qc.setQueryData(['pension-cases', 'detail', id], data);
      toast.success(t('update.success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(t('update.error'), allMessages.join(' · '));
        return;
      }
      toast.error(t('update.error'));
    },
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/pension-cases/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pension-cases', 'list'] });
      toast.success(t('delete.success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError;
      if (ae.response?.status === 409) {
        toast.error(t('delete.not_submitted'));
        return;
      }
      toast.error(t('delete.error'));
    },
  });
}

export function useAddSalaryRecord(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: SalaryRecordInput) => {
      await http.post(`/pension-cases/${caseId}/salary-records`, input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('salary.add_success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(t('salary.add_error'), allMessages.join(' · '));
        return;
      }
      toast.error(t('salary.add_error'));
    },
  });
}

export function useRemoveSalaryRecord(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (recordId: number | string) => {
      await http.delete(`/pension-cases/${caseId}/salary-records/${recordId}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('salary.remove_success')); },
    onError: () => { toast.error(t('salary.remove_error')); },
  });
}

export function useAddServiceRecord(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: ServiceRecordInput) => {
      await http.post(`/pension-cases/${caseId}/service-records`, input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('service.add_success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(t('service.add_error'), allMessages.join(' · '));
        return;
      }
      toast.error(t('service.add_error'));
    },
  });
}

export function useRemoveServiceRecord(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (recordId: number | string) => {
      await http.delete(`/pension-cases/${caseId}/service-records/${recordId}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('service.remove_success')); },
    onError: () => { toast.error(t('service.remove_error')); },
  });
}

export function useAddWorkCycle(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: WorkCycleInput) => {
      await http.post(`/pension-cases/${caseId}/work-cycles`, input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('cycle.add_success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(t('cycle.add_error'), allMessages.join(' · '));
        return;
      }
      toast.error(t('cycle.add_error'));
    },
  });
}

export function useRemoveWorkCycle(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (recordId: number | string) => {
      await http.delete(`/pension-cases/${caseId}/work-cycles/${recordId}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('cycle.remove_success')); },
    onError: () => { toast.error(t('cycle.remove_error')); },
  });
}

export function useAddIncomeConceptRecord(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: IncomeConceptRecordInput) => {
      await http.post(`/pension-cases/${caseId}/income-concept-records`, input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('income_concept.add_success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(t('income_concept.add_error'), allMessages.join(' · '));
        return;
      }
      toast.error(t('income_concept.add_error'));
    },
  });
}

export function useRemoveIncomeConceptRecord(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (recordId: number | string) => {
      await http.delete(`/pension-cases/${caseId}/income-concept-records/${recordId}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('income_concept.remove_success')); },
    onError: () => { toast.error(t('income_concept.remove_error')); },
  });
}

/**
 * POST /pension-cases/{id}/transitions — Máquina declarativa de estados (S6, RF-EXP-005..010, ADR-07).
 *
 * Respuestas de error diferenciadas:
 *  - 422 fuera de matriz / evidencia exigida ausente o corta / base legal no vigente / missing de completitud
 *  - 403 sin el rol del permiso (cases.review | cases.approve | cases.reject | cases.reopen)
 *  - 409 reapertura rompería la reservación expediente-abierto-por-persona
 *
 * El toast de error sintetiza los campos de diagnóstico que devuelve el backend
 * (status, attempted_to, missing, message) para que el usuario entienda la causa.
 */
interface TransitionResponse { data: PensionCase; transition: PensionCaseHistory; }

interface TransitionError422 {
  message?: string;
  status?: string;
  attempted_to?: string;
  case_id?: number | null;
  missing?: string[];
  errors?: Record<string, string[]>;
}

interface TransitionError409 {
  message?: string;
  case?: PensionCase | null;
  case_id?: number | null;
  status?: string | null;
}

export function useCaseTransition(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: TransitionInput) => {
      const r = await http.post<TransitionResponse>(`/pension-cases/${caseId}/transitions`, input);
      return r.data;
    },
    onSuccess: (data) => {
      // El expediente actualizado + la fila del historial
      qc.setQueryData(['pension-cases', 'detail', caseId], data.data);
      qc.invalidateQueries({ queryKey: ['pension-cases', 'history', caseId] });
      qc.invalidateQueries({ queryKey: ['pension-cases', 'list'] });
      toast.success(t('transition.success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<TransitionError422 & TransitionError409>;
      const status = ae.response?.status;

      // 409 — reapertura rompería la reservación expediente-abierto-por-persona
      if (status === 409) {
        const body = ae.response?.data;
        const detail = body?.message ?? t('transition.error_409');
        toast.errorDetail(t('transition.error'), detail);
        return;
      }

      // 422 — fuera de matriz / evidencia / vigencia / completitud
      if (status === 422) {
        const body = ae.response?.data;
        const parts: string[] = [];
        if (body?.status && body?.attempted_to) {
          parts.push(t('transition.out_of_matrix', { from: body.status, to: body.attempted_to }));
        }
        if (body?.missing && body.missing.length > 0) {
          parts.push(t('transition.missing_checklist', { items: body.missing.join(', ') }));
        }
        if (body?.errors) {
          const fieldErrors = Object.values(body.errors).flat();
          if (fieldErrors.length > 0) parts.push(...fieldErrors);
        }
        if (body?.message && parts.length === 0) parts.push(body.message);
        if (parts.length === 0) parts.push(t('transition.error'));
        toast.errorDetail(t('transition.error'), parts.join(' · '));
        return;
      }

      toast.error(t('transition.error'));
    },
  });
}

// === Entitled Relatives (familiares con derecho) ===

/** POST /pension-cases/{id}/entitled-relatives — añadir familiar con derecho */
export function useAddEntitledRelative(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: EntitledRelativeInput) => {
      await http.post(`/pension-cases/${caseId}/entitled-relatives`, input);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('entitled_relative.add_success')); },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        const allMessages = Object.values(ae.response.data.errors).flat();
        if (allMessages.length > 0) toast.errorDetail(t('entitled_relative.add_error'), allMessages.join(' · '));
        return;
      }
      toast.error(t('entitled_relative.add_error'));
    },
  });
}

/** DELETE /pension-cases/{id}/entitled-relatives/{record} — eliminar familiar con derecho */
export function useRemoveEntitledRelative(caseId: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('pension-cases');
  const toast = useToast();
  return useMutation({
    mutationFn: async (recordId: number | string) => {
      await http.delete(`/pension-cases/${caseId}/entitled-relatives/${recordId}`);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pension-cases', 'detail', caseId] }); toast.success(t('entitled_relative.remove_success')); },
    onError: () => { toast.error(t('entitled_relative.remove_error')); },
  });
}
