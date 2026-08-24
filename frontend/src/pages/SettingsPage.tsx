import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, MessageCircle } from 'lucide-react'
import { useWebPush } from '../hooks/useWebPush'
import { Badge, Button } from '../components/ui'
import { TelegramLinkModal } from '../components/settings/TelegramLinkModal'
import { CategoriesSection } from '../components/settings/CategoriesSection'
import { useAuthStore } from '../store/authStore'
import { showErrorToast, showSuccessToast } from '../utils/toast'

export function SettingsPage() {
  const { t } = useTranslation()
  const { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe } = useWebPush()
  const user = useAuthStore((state) => state.user)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe()
      } else {
        await subscribe()
        showSuccessToast(t('settings.webPushEnabled'))
      }
    } catch {
      showErrorToast(t('settings.webPushError'))
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t('nav.settings')}</h1>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">{t('settings.account')}</h2>
        <p className="mt-1 text-sm text-muted">{user?.username}</p>
      </section>

      <CategoriesSection />

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('settings.webPush')}</h2>
            <p className="mt-1 text-sm text-muted">{t('settings.webPushDescription')}</p>
          </div>
          {isSubscribed ? (
            <Bell className="size-5 shrink-0 text-primary-600" aria-hidden="true" />
          ) : (
            <BellOff className="size-5 shrink-0 text-muted" aria-hidden="true" />
          )}
        </div>

        {!isSupported && (
          <p className="mt-3 text-sm text-warning">{t('settings.webPushUnsupported')}</p>
        )}

        {isSupported && permission === 'denied' && (
          <p className="mt-3 text-sm text-danger">{t('settings.webPushDenied')}</p>
        )}

        {isSupported && permission !== 'denied' && (
          <Button
            className="mt-3"
            variant={isSubscribed ? 'secondary' : 'primary'}
            isLoading={isLoading}
            onClick={() => void handleToggle()}
          >
            {t(isSubscribed ? 'settings.disableWebPush' : 'settings.enableWebPush')}
          </Button>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('settings.telegram')}</h2>
            <p className="mt-1 text-sm text-muted">{t('settings.telegramDescription')}</p>
          </div>
          <MessageCircle className="size-5 shrink-0 text-muted" aria-hidden="true" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Badge variant={user?.telegram_chat_id ? 'success' : 'default'}>
            {t(user?.telegram_chat_id ? 'settings.telegramLinked' : 'settings.telegramNotLinked')}
          </Badge>
          {!user?.telegram_chat_id && (
            <Button size="sm" onClick={() => setIsLinkModalOpen(true)}>
              {t('settings.telegramLinkCta')}
            </Button>
          )}
        </div>
      </section>

      <TelegramLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} />
    </div>
  )
}
