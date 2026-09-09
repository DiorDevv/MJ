import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

export type StatTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONE_CLASS: Record<StatTone, string> = {
  neutral: 'bg-surface-hover text-muted',
  accent: 'bg-accent-subtle text-accent',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
}

interface StatTileProps {
  label: string
  value: string | number
  icon?: LucideIcon
  tone?: StatTone
  /** Small secondary line under the label (e.g. "eng uzun: 12"). */
  hint?: string
  className?: string
}

/** Icon chip + mono value + label. The single stat-block used on Daily and
 * Stats — generalised from the old inline tile in StatsStrip. */
export function StatTile({ label, value, icon: Icon, tone = 'neutral', hint, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-card sm:p-4',
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md',
            TONE_CLASS[tone],
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-mono text-lg leading-tight font-semibold text-foreground sm:text-xl">
          {value}
        </p>
        <p className="truncate text-xs text-muted">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted/70">{hint}</p>}
      </div>
    </div>
  )
}
