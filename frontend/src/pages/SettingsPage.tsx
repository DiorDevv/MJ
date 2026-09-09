import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, MessageCircle, UserRound } from 'lucide-react'
import { format } from 'date-fns'
import { enUS, uz } from 'date-fns/locale'
import { useWebPush } from '../hooks/useWebPush'
import { useMutation } from '@tanstack/react-query'
import { Badge, Button, Card } from '../components/ui'
import { PageHeader } from '../components/layout/PageHeader'
import { Page } from '../components/layout/Page'
import { TelegramLinkModal } from '../components/settings/TelegramLinkModal'
import { CategoriesSection } from '../components/settings/CategoriesSection'
import { QuietHoursSection } from '../components/settings/QuietHoursSection'
import { ChangePasswordSection } from '../components/settings/ChangePasswordSection'
import { unlinkTelegram } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { showErrorToast, showSuccessToast } from '../utils/toast'
import { ApiError } from '../api/client'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe } = useWebPush()
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const setAuth = useAuthStore((state) => state.setAuth)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const locale = i18n.language.startsWith('en') ? enUS : uz

  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: (updated) => {
      if (accessToken) setAuth(accessToken, updated)
      showSuccessToast(t('settings.telegramUnlinked'))
    },
    onError: (error) =>
      showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError')),
  })

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
    <Page>
      <div className="flex max-w-2xl flex-col gap-4">
        <PageHeader title={t('nav.settings')} />

        <Card
          title={t('settings.account')}
          icon={<UserRound className="size-4" aria-hidden="true" />}
        >
          <p className="text-sm font-medium text-foreground">{user?.username}</p>
          {user?.created_at && (
            <p className="mt-1 text-xs text-muted">
              {t('settings.memberSince')}:{' '}
              {format(new Date(user.created_at), 'd MMMM yyyy', { locale })}
            </p>
          )}
        </Card>

        <ChangePasswordSection />

        <CategoriesSection />

        <Card title={t('settings.webPush')} icon={<Bell className="size-4" aria-hidden="true" />}>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted">{t('settings.webPushDescription')}</p>
            {isSubscribed ? (
              <Bell className="size-5 shrink-0 text-accent" aria-hidden="true" />
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
            <div className="mt-3 flex items-center gap-3">
              <Badge variant={isSubscribed ? 'success' : 'default'}>
                {t(isSubscribed ? 'settings.connected' : 'settings.notConnected')}
              </Badge>
              <Button
                variant={isSubscribed ? 'secondary' : 'primary'}
                size="sm"
                isLoading={isLoading}
                onClick={() => void handleToggle()}
              >
                {t(isSubscribed ? 'settings.disableWebPush' : 'settings.enableWebPush')}
              </Button>
            </div>
          )}
        </Card>

        <QuietHoursSection />

        <Card
          title={t('settings.telegram')}
          icon={<MessageCircle className="size-4" aria-hidden="true" />}
        >
          <p className="text-sm text-muted">{t('settings.telegramDescription')}</p>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant={user?.telegram_chat_id ? 'success' : 'default'}>
              {t(user?.telegram_chat_id ? 'settings.telegramLinked' : 'settings.telegramNotLinked')}
            </Badge>
            {!user?.telegram_chat_id ? (
              <Button size="sm" onClick={() => setIsLinkModalOpen(true)}>
                {t('settings.telegramLinkCta')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                isLoading={unlinkMutation.isPending}
                onClick={() => unlinkMutation.mutate()}
              >
                {t('settings.telegramUnlink')}
              </Button>
            )}
          </div>
        </Card>

        <TelegramLinkModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} />
      </div>
    </Page>
  )
}
