/**
 * recharts needs concrete color strings, not Tailwind classes. Read them once
 * from the design tokens in index.css so the charts re-theme with the rest of
 * the app instead of duplicating the palette. Fallbacks keep tests / SSR (where
 * getComputedStyle returns "") rendering something sane.
 */

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export interface ChartTheme {
  accent: string
  success: string
  warning: string
  danger: string
  muted: string
  foreground: string
  grid: string
  axis: string
  surface: string
  border: string
}

let cached: ChartTheme | null = null

export function chartTheme(): ChartTheme {
  if (cached) return cached
  cached = {
    accent: token('--color-accent', '#22d3ee'),
    success: token('--color-success', '#34d399'),
    warning: token('--color-warning', '#f59e0b'),
    danger: token('--color-danger', '#f43f5e'),
    muted: token('--color-muted', '#8b8f99'),
    foreground: token('--color-foreground', '#e8e9ec'),
    surface: token('--color-surface', '#121316'),
    border: token('--color-border-strong', 'rgba(255,255,255,0.16)'),
    grid: 'rgba(255,255,255,0.06)',
    axis: token('--color-muted', '#8b8f99'),
  }
  return cached
}

/** Shared props for a recharts <Tooltip> so every chart's tooltip matches the
 * app's surface/border/ink instead of recharts' white default. */
export function tooltipProps() {
  const t = chartTheme()
  return {
    cursor: { stroke: t.border, strokeWidth: 1 },
    contentStyle: {
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      fontSize: 12,
      color: t.foreground,
      boxShadow: '0 8px 24px -6px rgba(0,0,0,0.5)',
    },
    labelStyle: { color: t.muted, marginBottom: 2 },
    itemStyle: { color: t.foreground },
  }
}

/** high → medium → low, matching PRIORITY_DOT_CLASS (danger / warning / success). */
export function priorityColor(priority: 'low' | 'medium' | 'high'): string {
  const t = chartTheme()
  return { low: t.success, medium: t.warning, high: t.danger }[priority]
}
