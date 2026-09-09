import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { Button, Card, Input } from '../ui'
import { changePassword } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'

export function ChangePasswordSection() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: ({ access_token }) => {
      if (user) setAuth(access_token, user)
      showSuccessToast(t('settings.passwordChanged'))
      setOpen(false)
      setCurrent('')
      setNext('')
      setConfirm('')
    },
    onError: (error) =>
      showErrorToast(error instanceof ApiError ? error.message : t('settings.passwordChangeError')),
  })

  const mismatch = confirm.length > 0 && next !== confirm
  const canSubmit = current.length > 0 && next.length >= 8 && !mismatch

  return (
    <Card title={t('settings.password')} icon={<KeyRound className="size-4" aria-hidden="true" />}>
      {!open ? (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {t('settings.changePassword')}
        </Button>
      ) : (
        <div className="flex max-w-sm flex-col gap-3">
          <Input
            type="password"
            label={t('settings.currentPassword')}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
          <Input
            type="password"
            label={t('settings.newPassword')}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            type="password"
            label={t('settings.confirmNewPassword')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? t('validation.passwordsMustMatch') : undefined}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted">{t('settings.passwordChangeHint')}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              isLoading={mutation.isPending}
              disabled={!canSubmit}
              onClick={() => mutation.mutate({ current_password: current, new_password: next })}
            >
              {t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
