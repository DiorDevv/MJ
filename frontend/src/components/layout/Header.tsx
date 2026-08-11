import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ListTodo } from 'lucide-react'
import { NAV_ITEMS } from '../../config/navigation'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { UserMenu } from './UserMenu'
import { cn } from '../../utils/cn'

export function Header() {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-2 font-semibold text-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm shadow-primary-600/30">
            <ListTodo className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg">{t('app.name')}</span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.mainLabel')}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-muted hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-lg bg-primary-100 dark:bg-primary-900"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <item.icon className="relative z-10 size-4" aria-hidden="true" />
                  <span className="relative z-10">{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
