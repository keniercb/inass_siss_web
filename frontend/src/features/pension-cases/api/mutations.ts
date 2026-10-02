import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { components } from '@/types/api';
import type { CreateCaseInput, UpdateCaseInput, SalaryRecordInput, ServiceRecordInput, WorkCycleInput, IncomeConceptRecordInput } from '../schemas/pension-case.schema';
import type { AxiosError } from 'axios';

type PensionCase = components['schemas']['PensionCase'];
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
