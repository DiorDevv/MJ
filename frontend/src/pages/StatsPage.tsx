import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useStats } from '../hooks/useStats'
import { Dropdown, Skeleton } from '../components/ui'
import type { DropdownOption } from '../components/ui'
import type { StatsPeriod } from '../api/stats'

const COMPLETED_COLOR = '#10b981'
const PENDING_COLOR = '#94a3b8'

export function StatsPage() {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<StatsPeriod>('weekly')
  const { data, isLoading } = useStats(period)

  const periodOptions: DropdownOption<StatsPeriod>[] = [
    { value: 'daily', label: t('stats.daily') },
    { value: 'weekly', label: t('stats.weekly') },
    { value: 'monthly', label: t('stats.monthly') },
  ]

  const completionData = data
    ? [
        { name: t('tasks.filterCompleted'), value: data.completed, color: COMPLETED_COLOR },
        { name: t('tasks.filterPending'), value: data.pending, color: PENDING_COLOR },
      ]
    : []

  const categoryData =
    data?.by_category.map((category) => ({
      name: category.name,
      value: category.count,
      color: category.color,
    })) ?? []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('nav.stats')}</h1>
        <Dropdown options={periodOptions} value={period} onChange={setPeriod} className="w-40" />
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      )}

      {!isLoading && data && data.total === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
          <p className="text-lg font-medium text-foreground">{t('stats.noData')}</p>
        </div>
      )}

      {!isLoading && data && data.total > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              {t('stats.completionRate')}
            </h2>
            <div className="relative">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={completionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {completionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
              <div
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-9"
                aria-hidden="true"
              >
                <span className="text-3xl font-bold text-foreground">
                  {Math.round(data.completion_rate * 100)}%
                </span>
                <span className="text-xs text-muted">{t('tasks.filterCompleted')}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{t('stats.byCategory')}</h2>
            {categoryData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">{t('stats.noCategoryData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={100}
                    stroke="none"
                    label
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
