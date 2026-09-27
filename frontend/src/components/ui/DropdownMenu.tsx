import { Fragment, type ReactNode } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem, MenuSeparator, MenuHeading } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'end', className }: DropdownMenuProps) {
  return (
    <Menu as="div" className="relative inline-block">
      {({ open }) => (
        <>
          <MenuButton as={Fragment}>
            {trigger}
          </MenuButton>
          {open && (
            <MenuItems
              anchor={`bottom ${align}`}
              className={cn(
                'absolute z-50 mt-2 min-w-[224px] rounded-md border bg-popover p-1 shadow-modal',
                'animate-dropdown-in origin-top',
                align === 'end' ? 'right-0' : 'left-0',
                className,
              )}
            >
              {children}
            </MenuItems>
          )}
        </>
      )}
    </Menu>
  );
}

export function DropdownMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-3 py-2 border-b border-border', className)}>{children}</div>
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
