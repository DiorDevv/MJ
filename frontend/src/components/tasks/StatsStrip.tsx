import { useTranslation } from 'react-i18next'
import { AlertTriangle, CalendarClock, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface StatsStripProps {
  dueToday: number
  overdue: number
  completionRate: number
}

type Tone = 'neutral' | 'danger' | 'accent'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-hover text-muted',
  danger: 'bg-danger-subtle text-danger',
  accent: 'bg-accent-subtle text-accent',
}

interface Tile {
  label: string
  value: string | number
  icon: LucideIcon
  tone: Tone
}

export function StatsStrip({ dueToday, overdue, completionRate }: StatsStripProps) {
  const { t } = useTranslation()

  const tiles: Tile[] = [
    { label: t('stats.dueToday'), value: dueToday, icon: CalendarClock, tone: 'neutral' },
    {
      label: t('stats.overdueCount'),
      value: overdue,
      icon: AlertTriangle,
      tone: overdue > 0 ? 'danger' : 'neutral',
    },
    {
      label: t('stats.completionRate'),
      value: `${completionRate}%`,
      icon: TrendingUp,
      tone: 'accent',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 sm:p-4"
        >
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-md',
              TONE_CLASS[tile.tone],
            )}
          >
            <tile.icon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-lg leading-tight font-semibold text-foreground sm:text-xl">
              {tile.value}
            </p>
            <p className="truncate text-xs text-muted">{tile.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
