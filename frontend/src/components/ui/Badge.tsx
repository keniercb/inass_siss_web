import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'active' | 'suspended' | 'terminated';
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeProps['variant'], string> = {
  submitted: 'badge-submitted',
  under_review: 'badge-under_review',
  approved: 'badge-approved',
  rejected: 'badge-rejected',
  active: 'badge-approved',
  suspended: 'badge-under_review',
  terminated: 'badge-rejected',
};

export function Badge({ variant, children, className }: BadgeProps) {
  return <span className={cn('badge', variantClasses[variant], className)}>{children}</span>;
}
