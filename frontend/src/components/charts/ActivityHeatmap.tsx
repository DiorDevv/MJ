import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, getDay, parseISO } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import type { ActivityDay } from '../../types/stats'

interface ActivityHeatmapProps {
  days: ActivityDay[]
}

const CELL = 13
const GAP = 3
const STEP = CELL + GAP
// Monday-first, matching WeeklyPage.
const WEEKDAY_ROW = (isoDate: string): number => (getDay(parseISO(isoDate)) + 6) % 7

/** intensity 0–4 from a day's completed count. */
function level(completed: number): number {
  if (completed <= 0) return 0
  if (completed === 1) return 1
  if (completed <= 3) return 2
  if (completed <= 5) return 3
  return 4
}

// Sequential single hue (success), light → dark by intensity — never a rainbow.
const FILL = [
  'var(--color-surface-hover)',
  'color-mix(in oklab, var(--color-success) 25%, var(--color-surface))',
  'color-mix(in oklab, var(--color-success) 45%, var(--color-surface))',
  'color-mix(in oklab, var(--color-success) 70%, var(--color-surface))',
  'var(--color-success)',
]

/** GitHub-style contribution grid: weeks as columns, weekdays as rows. Cells are
 * tinted by completions that day; each carries a native tooltip + aria-label so
 * the data is reachable without hover. */
export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('en') ? enUS : uz

  const { columns, monthLabels, width, height } = useMemo(() => {
    const first = days[0]
    if (!first) {
      return {
        columns: [] as ActivityDay[][],
        monthLabels: [] as { x: number; label: string }[],
        width: 0,
        height: 0,
      }
    }
    const cols: ActivityDay[][] = []
    let current: ActivityDay[] = new Array(WEEKDAY_ROW(first.date)).fill(null)
    for (const day of days) {
      current.push(day)
      if (current.length === 7) {
        cols.push(current)
        current = []
      }
    }
    if (current.length > 0) {
      while (current.length < 7) current.push(null as unknown as ActivityDay)
      cols.push(current)
    }

    const labels: { x: number; label: string }[] = []
    let lastMonth = ''
    cols.forEach((col, index) => {
      const first = col.find(Boolean)
      if (!first) return
      const month = format(parseISO(first.date), 'LLL', { locale })
      if (month !== lastMonth) {
        labels.push({ x: index * STEP, label: month })
        lastMonth = month
      }
    })

    return {
      columns: cols,
      monthLabels: labels,
      width: cols.length * STEP,
      height: 7 * STEP,
    }
  }, [days, locale])

  if (columns.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">{t('stats.noActivity')}</p>
  }

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height + 16}
        className="text-[10px]"
        role="img"
        aria-label={t('stats.activityHeatmap')}
      >
        {monthLabels.map((m) => (
          <text key={`${m.x}-${m.label}`} x={m.x} y={9} fill="var(--color-muted)">
            {m.label}
          </text>
        ))}
        <g transform="translate(0, 16)">
          {columns.map((col, ci) =>
            col.map((day, ri) => {
              if (!day) return null
              const lvl = level(day.completed)
              return (
                <rect
                  key={day.date}
                  x={ci * STEP}
                  y={ri * STEP}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  fill={FILL[lvl]}
                  aria-label={`${format(parseISO(day.date), 'd MMM', { locale })}: ${t(
                    'stats.daysActiveCount',
                    { count: day.completed },
                  )}`}
                >
                  <title>{`${format(parseISO(day.date), 'd MMM yyyy', { locale })} — ${t(
                    'stats.daysActiveCount',
                    { count: day.completed },
                  )}`}</title>
                </rect>
              )
            }),
          )}
        </g>
      </svg>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
        <span>{t('stats.heatmapLess')}</span>
        {FILL.map((fill, index) => (
          <span
            key={index}
            className="inline-block size-3 rounded-[3px]"
            style={{ backgroundColor: fill }}
          />
        ))}
        <span>{t('stats.heatmapMore')}</span>
      </div>
    </div>
  )
}
