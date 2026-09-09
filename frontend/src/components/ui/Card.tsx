import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Short heading rendered in the card's header row. */
  title?: ReactNode
  /** Optional right-aligned slot in the header row (a control, a link, a value). */
  action?: ReactNode
  /** Icon chip shown before the title. */
  icon?: ReactNode
  /** Drop the default padding (for cards that host a full-bleed table/chart). */
  bare?: boolean
}

/** The `rounded-lg border border-border bg-surface` panel used across every
 * page, with a consistent optional header. Replaces the copy-pasted markup. */
export function Card({ title, action, icon, bare, className, children, ...rest }: CardProps) {
  const hasHeader = title != null || action != null
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface shadow-card',
        !bare && 'p-5',
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <div className={cn('flex items-center justify-between gap-3', !bare ? 'mb-4' : 'p-5 pb-0')}>
          <div className="flex min-w-0 items-center gap-2">
            {icon && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-hover text-muted">
                {icon}
              </span>
            )}
            {title != null && (
              <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
            )}
          </div>
          {action != null && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
