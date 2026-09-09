import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** Right-aligned actions (usually a primary button). */
  actions?: ReactNode
}

/** The title + optional subtitle + right-aligned actions row every page opens
 * with. Replaces the ad-hoc `flex justify-between` + `<h1>` in each page. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle != null && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions != null && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
