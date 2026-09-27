import { type ReactNode } from 'react';
import { Dialog as HeadlessDialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Dialog({ open, onClose, title, description, children, className, size = 'md' }: DialogProps) {
  return (
    <HeadlessDialog open={open} onClose={onClose} className="relative z-[10000]">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 animate-modal-in" aria-hidden="true" />

      {/* Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={cn(
            'w-full bg-card rounded-lg shadow-modal animate-modal-in',
            'max-h-[90vh] overflow-y-auto',
            sizeClasses[size],
            className,
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between px-6 py-4 border-b border-border">
              <div className="flex-1">
                {title && <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>}
                {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className="p-6">{children}</div>
        </DialogPanel>
      </div>
    </HeadlessDialog>
  );
}
