import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { http } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';
import type { components } from '@/types/api';
import type { AxiosError } from 'axios';
import type {
  CreateDisabilityRuleInput, UpdateDisabilityRuleInput,
  CreateSpecialModificationInput, UpdateSpecialModificationInput,
  CreateBeneficiaryRuleInput, UpdateBeneficiaryRuleInput,
} from '../schemas/disability-config.schema';

type DisabilityRule = components['schemas']['DisabilityRule'];
type SpecialDisabilityModification = components['schemas']['SpecialDisabilityModification'];
type BeneficiaryRule = components['schemas']['BeneficiaryRule'];

interface ApiResponse<T> { data: T }

/** POST /disability-rules — crear regla de invalidez con brackets anidados */
export function useCreateDisabilityRule() {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: CreateDisabilityRuleInput) => {
      const r = await http.post<ApiResponse<DisabilityRule>>('/disability-rules', input);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disability-rules'] });
      toast.success(t('rule.create_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        toast.errorDetail(t('rule.create_error'), Object.values(ae.response.data.errors).flat().join(' · '));
        return;
      }
      toast.error(ae.response?.data?.message ?? t('rule.create_error'));
    },
  });
}

/** PATCH /disability-rules/{id} — actualizar porcientos y/o brackets */
export function useUpdateDisabilityRule(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: UpdateDisabilityRuleInput) => {
      const r = await http.patch<ApiResponse<DisabilityRule>>(`/disability-rules/${id}`, input);
      return r.data.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(['disability-rules', 'detail', id], data);
      qc.invalidateQueries({ queryKey: ['disability-rules'] });
      toast.success(t('rule.update_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        toast.errorDetail(t('rule.update_error'), Object.values(ae.response.data.errors).flat().join(' · '));
        return;
      }
      toast.error(ae.response?.data?.message ?? t('rule.update_error'));
    },
  });
}

/** DELETE /disability-rules/{id} — eliminar regla (cascada con brackets) */
export function useDeleteDisabilityRule() {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/disability-rules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disability-rules'] });
      toast.success(t('rule.delete_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string }>;
      toast.error(ae.response?.data?.message ?? t('rule.delete_error'));
    },
  });
}

/** POST /special-disability-modifications */
export function useCreateSpecialModification() {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: CreateSpecialModificationInput) => {
      const r = await http.post<ApiResponse<SpecialDisabilityModification>>('/special-disability-modifications', input);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-disability-modifications'] });
      toast.success(t('special.create_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        toast.errorDetail(t('special.create_error'), Object.values(ae.response.data.errors).flat().join(' · '));
        return;
      }
      toast.error(ae.response?.data?.message ?? t('special.create_error'));
    },
  });
}

/** PATCH /special-disability-modifications/{id} */
export function useUpdateSpecialModification(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: UpdateSpecialModificationInput) => {
      const r = await http.patch<ApiResponse<SpecialDisabilityModification>>(`/special-disability-modifications/${id}`, input);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-disability-modifications'] });
      toast.success(t('special.update_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        toast.errorDetail(t('special.update_error'), Object.values(ae.response.data.errors).flat().join(' · '));
        return;
      }
      toast.error(ae.response?.data?.message ?? t('special.update_error'));
    },
  });
}

/** DELETE /special-disability-modifications/{id} */
export function useDeleteSpecialModification() {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/special-disability-modifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['special-disability-modifications'] });
      toast.success(t('special.delete_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string }>;
      toast.error(ae.response?.data?.message ?? t('special.delete_error'));
    },
  });
}

/** POST /beneficiary-rules */
export function useCreateBeneficiaryRule() {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: CreateBeneficiaryRuleInput) => {
      const r = await http.post<ApiResponse<BeneficiaryRule>>('/beneficiary-rules', input);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiary-rules'] });
      toast.success(t('beneficiary.create_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        toast.errorDetail(t('beneficiary.create_error'), Object.values(ae.response.data.errors).flat().join(' · '));
        return;
      }
      toast.error(ae.response?.data?.message ?? t('beneficiary.create_error'));
    },
  });
}

/** PATCH /beneficiary-rules/{id} */
export function useUpdateBeneficiaryRule(id: number | string) {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (input: UpdateBeneficiaryRuleInput) => {
      const r = await http.patch<ApiResponse<BeneficiaryRule>>(`/beneficiary-rules/${id}`, input);
      return r.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiary-rules'] });
      toast.success(t('beneficiary.update_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      if (ae.response?.status === 422 && ae.response.data?.errors) {
        toast.errorDetail(t('beneficiary.update_error'), Object.values(ae.response.data.errors).flat().join(' · '));
        return;
      }
      toast.error(ae.response?.data?.message ?? t('beneficiary.update_error'));
    },
  });
}

/** DELETE /beneficiary-rules/{id} */
export function useDeleteBeneficiaryRule() {
  const qc = useQueryClient();
  const { t } = useTranslation('disability-config');
  const toast = useToast();
  return useMutation({
    mutationFn: async (id: number | string) => {
      await http.delete(`/beneficiary-rules/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiary-rules'] });
      toast.success(t('beneficiary.delete_success'));
    },
    onError: (err: unknown) => {
      const ae = err as AxiosError<{ message?: string }>;
      toast.error(ae.response?.data?.message ?? t('beneficiary.delete_error'));
    },
  });
}
