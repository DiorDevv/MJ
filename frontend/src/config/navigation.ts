import { BarChart3, CalendarDays, CalendarRange, ListChecks, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app/today', labelKey: 'nav.today', icon: CalendarDays },
  { to: '/app/week', labelKey: 'nav.week', icon: CalendarRange },
  { to: '/app/list', labelKey: 'nav.list', icon: ListChecks },
  { to: '/app/stats', labelKey: 'nav.stats', icon: BarChart3 },
  { to: '/app/settings', labelKey: 'nav.settings', icon: Settings },
]
