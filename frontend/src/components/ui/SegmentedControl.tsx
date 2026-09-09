import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  'aria-label'?: string
  size?: 'sm' | 'md'
  className?: string
}

/** A radio-group toggle with an animated active pill — for a small, fixed set of
 * mutually exclusive choices (stats period, list status). Keyboard-accessible
 * via native radio semantics; the pill slides between options with a shared
 * `layoutId` (same technique as MobileTabBar). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const groupId = useId()
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <label
            key={option.value}
            className={cn(
              'relative cursor-pointer rounded-md text-center font-medium transition-colors select-none',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
              active ? 'text-accent-foreground' : 'text-muted hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${groupId}`}
                className="absolute inset-0 rounded-md bg-accent"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{option.label}</span>
            <input
              type="radio"
              name={groupId}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
          </label>
        )
      })}
    </div>
  )
}
