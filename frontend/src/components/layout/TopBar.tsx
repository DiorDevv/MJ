import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { LanguageSwitcher } from './LanguageSwitcher'
import { UserMenu } from './UserMenu'
import { cn } from '../../utils/cn'

function TelegramSyncStatus() {
  const { t } = useTranslation()
  const isLinked = useAuthStore((state) => state.user?.telegram_chat_id != null)

  return (
    <div
      className={cn(
        'hidden shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium sm:flex',
        isLinked ? 'border-success/25 bg-success-subtle text-success' : 'border-border text-muted',
      )}
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', isLinked ? 'bg-success' : 'bg-muted')}
        aria-hidden="true"
      />
      {isLinked ? t('topbar.telegramLinked') : t('topbar.telegramNotLinked')}
    </div>
  )
}

export function TopBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault()
    const query = search.trim()
    navigate(query ? `/app/list?search=${encodeURIComponent(query)}` : '/app/list')
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <form onSubmit={handleSearchSubmit} className="relative min-w-0 max-w-md flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('common.searchPlaceholder')}
          aria-label={t('common.search')}
          className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-muted transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        />
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <TelegramSyncStatus />
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>
  )
}
