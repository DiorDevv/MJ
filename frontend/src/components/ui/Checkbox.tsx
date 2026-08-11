import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, id, className, ...props }, ref) => {
    const generatedId = useId()
    const checkboxId = id ?? generatedId

    return (
      <label
        htmlFor={checkboxId}
        className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
      >
        <span className="relative inline-flex">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            className={cn(
              'peer size-4 shrink-0 appearance-none rounded border border-border bg-surface',
              'checked:border-primary-600 checked:bg-primary-600',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
              className,
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute inset-0 size-4 scale-0 text-white peer-checked:scale-100"
            aria-hidden="true"
          />
        </span>
        {label}
      </label>
    )
  },
)
Checkbox.displayName = 'Checkbox'
