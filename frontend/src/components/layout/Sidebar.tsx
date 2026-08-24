import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as Tooltip from '@radix-ui/react-tooltip'
import { ChevronsLeft, ChevronsRight, ListTodo, Plus, type LucideIcon } from 'lucide-react'
import { NAV_ITEMS } from '../../config/navigation'
import { cn } from '../../utils/cn'

const COLLAPSE_STORAGE_KEY = 'mj_sidebar_collapsed'

function getStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface SidebarLinkProps {
  to: string
  icon: LucideIcon
  label: string
  collapsed: boolean
}

function SidebarLink({ to, icon: Icon, label, collapsed }: SidebarLinkProps) {
  const link = (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-accent-subtle text-accent'
            : 'text-muted hover:bg-surface-hover hover:text-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-40 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg"
        >
          {label}
          <Tooltip.Arrow className="fill-surface-hover" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export function Sidebar() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(getStoredCollapsed)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* private-browsing or storage disabled — collapse state just won't persist */
      }
      return next
    })
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center gap-2.5 px-4',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <ListTodo className="size-4" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold text-foreground">{t('app.name')}</span>
          )}
        </div>

        <div className={cn('px-3', collapsed && 'px-2')}>
          {collapsed ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Link
                  to="/app/today"
                  aria-label={t('sidebar.newTask')}
                  className="flex h-9 w-full items-center justify-center rounded-md bg-accent text-accent-foreground transition-colors hover:bg-accent-hover"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </Link>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="z-40 rounded-md border border-border bg-surface-hover px-2.5 py-1.5 text-xs font-medium text-foreground shadow-lg"
                >
                  {t('sidebar.newTask')}
                  <Tooltip.Arrow className="fill-surface-hover" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : (
            <Link
              to="/app/today"
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-hover"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t('sidebar.newTask')}
            </Link>
          )}
        </div>

        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4"
          aria-label={t('nav.mainLabel')}
        >
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={t(item.labelKey)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
            className={cn(
              'flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <ChevronsRight className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <>
                <ChevronsLeft className="size-4 shrink-0" aria-hidden="true" />
                <span>{t('sidebar.collapse')}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </Tooltip.Provider>
  )
}
