import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS } from '../../config/navigation'
import { cn } from '../../utils/cn'

export function MobileTabBar() {
  const { t } = useTranslation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/90 backdrop-blur-md lg:hidden"
      aria-label={t('nav.mainLabel')}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors',
              isActive ? 'text-primary-600' : 'text-muted',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary-600"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon className="size-5" aria-hidden="true" />
              {t(item.labelKey)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
