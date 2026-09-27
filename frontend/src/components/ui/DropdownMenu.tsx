import { Fragment, type ReactNode } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem, MenuSeparator, MenuHeading } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
  /** Ancho del menú desplegable. Default: 224px (w-56). */
  menuClassName?: string;
}

/**
 * DropdownMenu basado en Headless UI v2.
 *
 * IMPORTANTE: cuando se usa el prop `anchor`, Headless UI gestiona
 * el posicionamiento (position: fixed) automáticamente. NO añadir
 * clases `absolute`, `right-0`, `left-0` porque causan conflicto y
 * hacen que el menú ocupe todo el ancho de la página.
 *
 * El ancho se controla con `w-56` (224px) por defecto.
 */
export function DropdownMenu({
  trigger,
  children,
  align = 'end',
  className,
  menuClassName,
}: DropdownMenuProps) {
  return (
    <Menu as="div" className={cn('relative inline-block', className)}>
      <MenuButton as={Fragment}>{trigger}</MenuButton>
      <MenuItems
        anchor={`bottom ${align}`}
        className={cn(
          // Sin absolute ni right-0/left-0 — Headless UI v2 gestiona el positioning
          'z-50 w-56 rounded-md border bg-popover p-1 shadow-modal',
          'animate-dropdown-in origin-top',
          'outline-none',
          menuClassName,
        )}
      >
        {children}
      </MenuItems>
    </Menu>
  );
}

export function DropdownMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-3 py-2 border-b border-border', className)}>
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <MenuItem
      as="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-sm',
        'hover:bg-muted transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'data-[focus]:bg-muted data-[focus]:outline-none',
        className,
      )}
    >
      {children}
    </MenuItem>
  );
}

export function DropdownMenuSeparator() {
  return <MenuSeparator className="my-1 h-px bg-border" />;
}

export function DropdownMenuHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MenuHeading as="div" className={cn('px-3 py-1 text-xs font-medium text-muted-foreground', className)}>
      {children}
    </MenuHeading>
  );
}

export { ChevronDown };
