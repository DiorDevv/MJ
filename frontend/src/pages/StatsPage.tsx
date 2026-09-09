import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import { useActivity, useStats, useStreak } from '../hooks/useStats'
import { Card, ProgressRing, SegmentedControl, Skeleton } from '../components/ui'
import type { SegmentOption } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { Page } from '../components/layout/Page'
import { EmptyState } from '../components/tasks/EmptyState'
import { ActivityHeatmap } from '../components/charts/ActivityHeatmap'
import { chartTheme, priorityColor, tooltipProps } from '../components/charts/chartTheme'
import type { StatsPeriod } from '../api/stats'

export function StatsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language.startsWith('en') ? enUS : uz
  const [period, setPeriod] = useState<StatsPeriod>('weekly')
  const stats = useStats(period)
  const activity = useActivity(84)
  const streak = useStreak()
  const theme = chartTheme()

  const periodOptions: SegmentOption<StatsPeriod>[] = [
    { value: 'daily', label: t('stats.daily') },
    { value: 'weekly', label: t('stats.weekly') },
    { value: 'monthly', label: t('stats.monthly') },
  ]

  const trendData = useMemo(
    () =>
      (activity.data?.days ?? []).map((d) => ({
        date: d.date,
        [t('stats.tasksCompleted')]: d.completed,
        [t('stats.tasksCreated')]: d.created,
      })),
    [activity.data, t],
  )

  const priorityData = useMemo(
    () =>
      (stats.data?.by_priority ?? []).map((p) => ({
        name: t(`tasks.priority_${p.priority}`),
        priority: p.priority,
        count: p.count,
      })),
    [stats.data, t],
  )

  const categoryData = useMemo(
    () =>
      [...(stats.data?.by_category ?? [])]
        .sort((a, b) => b.count - a.count)
        .map((c) => ({ name: c.name, count: c.count, color: c.color })),
    [stats.data],
  )

  const isLoading = stats.isLoading || activity.isLoading || streak.isLoading
  const rate = stats.data ? Math.round(stats.data.completion_rate * 100) : 0
  const totallyEmpty =
    !isLoading &&
    (stats.data?.total ?? 0) === 0 &&
    (streak.data?.longest ?? 0) === 0 &&
    (activity.data?.days ?? []).every((d) => d.completed === 0 && d.created === 0)

  return (
    <Page>
      <PageHeader
        title={t('nav.stats')}
        subtitle={t('stats.subtitle')}
        actions={
          <SegmentedControl
            options={periodOptions}
            value={period}
            onChange={setPeriod}
            aria-label={t('stats.subtitle')}
          />
        }
      />

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full" />
          ))}
        </div>
      )}

      {totallyEmpty && (
        <EmptyState title={t('stats.noData')} body={t('stats.noActivity')} icon={TrendingUp} />
      )}

      {!isLoading && !totallyEmpty && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Streak */}
          <Card title={t('stats.streak')} icon={<Flame className="size-4" aria-hidden="true" />}>
            <div className="flex items-end gap-3">
              <span className="font-mono text-5xl leading-none font-bold text-foreground">
                {streak.data?.current ?? 0}
              </span>
              <span className="pb-1 text-sm text-muted">{t('stats.days')}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {t('stats.longestStreak', { count: streak.data?.longest ?? 0 })}
            </p>
          </Card>

          {/* Completion rate */}
          <Card title={t('stats.completionRate')}>
            <div className="flex items-center gap-4">
              <ProgressRing value={stats.data ? stats.data.completion_rate : 0} size={104}>
                <span className="font-mono text-2xl font-bold text-foreground">{rate}%</span>
              </ProgressRing>
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-muted">
                  <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                  {t('tasks.filterCompleted')}
                  <span className="font-mono text-foreground">{stats.data?.completed ?? 0}</span>
                </p>
                <p className="flex items-center gap-2 text-muted">
                  <span className="size-2 rounded-full bg-muted" aria-hidden="true" />
                  {t('tasks.filterPending')}
                  <span className="font-mono text-foreground">{stats.data?.pending ?? 0}</span>
                </p>
              </div>
            </div>
          </Card>

          {/* By priority */}
          <Card title={t('stats.byPriority')}>
            {priorityData.every((p) => p.count === 0) ? (
              <p className="py-10 text-center text-sm text-muted">{t('stats.noPriorityData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={priorityData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={64}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.axis, fontSize: 12 }}
                  />
                  <Tooltip {...tooltipProps()} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                    {priorityData.map((p) => (
                      <Cell key={p.priority} fill={priorityColor(p.priority)} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      fill={theme.foreground}
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Activity heatmap */}
          <Card
            title={t('stats.activityHeatmap')}
            action={<span className="text-xs text-muted">{t('stats.last12Weeks')}</span>}
            className="md:col-span-2 lg:col-span-3"
          >
            <ActivityHeatmap days={activity.data?.days ?? []} />
          </Card>

          {/* Completion trend */}
          <Card title={t('stats.completionTrend')} className="md:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.success} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={theme.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                  tick={{ fill: theme.axis, fontSize: 11 }}
                  tickFormatter={(v: string) => format(parseISO(v), 'd MMM', { locale })}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tick={{ fill: theme.axis, fontSize: 11 }}
                />
                <Tooltip
                  {...tooltipProps()}
                  labelFormatter={(v) =>
                    typeof v === 'string' ? format(parseISO(v), 'd MMM yyyy', { locale }) : v
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12, color: theme.muted }} />
                <Area
                  type="monotone"
                  dataKey={t('stats.tasksCompleted')}
                  stroke={theme.success}
                  strokeWidth={2}
                  fill="url(#fillCompleted)"
                />
                <Area
                  type="monotone"
                  dataKey={t('stats.tasksCreated')}
                  stroke={theme.muted}
                  strokeWidth={1.5}
                  fill="none"
                  strokeDasharray="4 3"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* By category */}
          <Card title={t('stats.byCategory')}>
            {categoryData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">{t('stats.noCategoryData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(140, categoryData.length * 34)}>
                <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: theme.axis, fontSize: 12 }}
                  />
                  <Tooltip {...tooltipProps()} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                    {categoryData.map((c) => (
                      <Cell key={c.name} fill={c.color} />
                    ))}
                    <LabelList
                      dataKey="count"
                      position="right"
                      fill={theme.foreground}
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}
    </Page>
  )
}
