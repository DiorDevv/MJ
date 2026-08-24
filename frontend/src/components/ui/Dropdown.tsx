import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface DropdownOption<T extends string> {
  value: T
  label: string
}

interface DropdownProps<T extends string> {
  options: Array<DropdownOption<T>>
  value: T
  onChange: (value: T) => void
  label?: string
  className?: string
}

// Radix Select reserves the empty string as its internal "no selection" sentinel
// and throws if a Select.Item uses it as a value — but this app's dropdowns (status/
// priority/category/sort filters, "no category") all model "unset"/"all" as `''`.
// Substituting a sentinel here, invisibly, keeps every call site's `value: ''` option
// working unchanged instead of pushing this Radix quirk out onto every caller.
const EMPTY_VALUE_SENTINEL = '__dropdown_empty__'

export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: DropdownProps<T>) {
  const radixValue = value === '' ? EMPTY_VALUE_SENTINEL : value

  return (
    <Select.Root
      value={radixValue}
      onValueChange={(next) => onChange((next === EMPTY_VALUE_SENTINEL ? '' : next) as T)}
    >
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <span id={`${label}-label`} className="text-sm font-medium text-foreground">
            {label}
          </span>
        )}
        <Select.Trigger
          aria-labelledby={label ? `${label}-label` : undefined}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-sm text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent data-[placeholder]:text-muted"
        >
          <Select.Value />
          <Select.Icon>
            <ChevronDown className="size-4 text-muted" aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            className="radix-pop z-30 max-h-60 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface-hover shadow-lg"
          >
            <Select.Viewport className="p-1">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value === '' ? EMPTY_VALUE_SENTINEL : option.value}
                  className="relative flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-surface-active"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check className="size-4 text-accent" aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </div>
    </Select.Root>
  )
}
