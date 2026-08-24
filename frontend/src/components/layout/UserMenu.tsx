import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/authStore'
import { useLogout } from '../../hooks/useLogout'

export function UserMenu() {
  const { t } = useTranslation()
  const username = useAuthStore((state) => state.user?.username)
  const logout = useLogout()

  return (
    <div className="flex items-center gap-2 border-l border-border pl-2">
      <span className="hidden text-sm font-medium text-foreground sm:inline">{username}</span>
      <button
        type="button"
        onClick={() => void logout()}
        aria-label={t('auth.logout')}
        className="flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
