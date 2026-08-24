import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Button, Modal } from '../ui'
import { fetchCurrentUserAuthorized, requestTelegramLinkCode } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'

interface TelegramLinkModalProps {
  isOpen: boolean
  onClose: () => void
}

function secondsUntil(isoDate: string): number {
  return Math.max(0, Math.round((new Date(isoDate).getTime() - Date.now()) / 1000))
}

export function TelegramLinkModal({ isOpen, onClose }: TelegramLinkModalProps) {
  const { t } = useTranslation()
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.telegramLinkTitle')}>
      {isOpen && <TelegramLinkModalContent onClose={onClose} />}
    </Modal>
  )
}

function TelegramLinkModalContent({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [code, setCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const accessToken = useAuthStore((state) => state.accessToken)
  const setAuth = useAuthStore((state) => state.setAuth)

  const requestCodeMutation = useMutation({
    mutationFn: requestTelegramLinkCode,
    onSuccess: (data) => {
      setCode(data.code)
      setExpiresAt(data.expires_at)
      setSecondsLeft(secondsUntil(data.expires_at))
    },
    onError: () => showErrorToast(t('settings.telegramLinkError')),
  })
  const { mutate: requestCode } = requestCodeMutation

  useEffect(() => {
    requestCode()
  }, [requestCode])

  useEffect(() => {
    if (!expiresAt) return
    const interval = setInterval(() => setSecondsLeft(secondsUntil(expiresAt)), 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const handleCheck = async () => {
    if (!accessToken) return
    setIsChecking(true)
    try {
      const user = await fetchCurrentUserAuthorized()
      if (user.telegram_chat_id) {
        setAuth(accessToken, user)
        showSuccessToast(t('settings.telegramLinkSuccess'))
        onClose()
      } else {
        showErrorToast(t('settings.telegramNotYetLinked'))
      }
    } catch (error) {
      showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
    } finally {
      setIsChecking(false)
    }
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-sm text-muted">{t('settings.telegramLinkInstructions')}</p>

      {requestCodeMutation.isPending || code === null ? (
        <div className="py-6 text-sm text-muted">{t('common.loading')}</div>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-surface-hover px-6 py-4 font-mono text-3xl font-bold tracking-[0.3em] text-foreground">
            {code}
          </div>
          <p className="text-xs text-muted">
            {secondsLeft > 0
              ? t('settings.telegramCodeExpiresIn', {
                  time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
                })
              : t('settings.telegramCodeExpired')}
          </p>
        </>
      )}

      <div className="flex w-full gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => requestCodeMutation.mutate()}
          isLoading={requestCodeMutation.isPending}
        >
          {t('settings.telegramNewCode')}
        </Button>
        <Button className="flex-1" onClick={() => void handleCheck()} isLoading={isChecking}>
          {t('settings.telegramCheckStatus')}
        </Button>
      </div>
    </div>
  )
}
