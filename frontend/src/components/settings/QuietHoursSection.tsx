import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { MoonStar } from 'lucide-react'
import { Button, Card, Checkbox, Input } from '../ui'
import { updateNotificationPreferences } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'

const toInputTime = (value: string | null): string => (value ? value.slice(0, 5) : '')

export function QuietHoursSection() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setAuth = useAuthStore((s) => s.setAuth)

  const [enabled, setEnabled] = useState(Boolean(user?.quiet_hours_start))
  const [start, setStart] = useState(toInputTime(user?.quiet_hours_start ?? null) || '22:00')
  const [end, setEnd] = useState(toInputTime(user?.quiet_hours_end ?? null) || '07:00')

  const mutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (updated) => {
      if (accessToken) setAuth(accessToken, updated)
      showSuccessToast(t('settings.quietHoursSaved'))
    },
    onError: (error) =>
      showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError')),
  })

  const handleSave = () => {
    mutation.mutate(
      enabled
        ? { quiet_hours_start: `${start}:00`, quiet_hours_end: `${end}:00` }
        : { quiet_hours_start: null, quiet_hours_end: null },
    )
  }

  return (
    <Card
      title={t('settings.quietHours')}
      icon={<MoonStar className="size-4" aria-hidden="true" />}
    >
      <p className="-mt-2 mb-3 text-sm text-muted">{t('settings.quietHoursDescription')}</p>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox checked={enabled} onChange={() => setEnabled((v) => !v)} />
        {t('settings.quietHoursEnable')}
      </label>

      {enabled && (
        <div className="mt-3 grid max-w-xs grid-cols-2 gap-3">
          <Input
            type="time"
            label={t('settings.quietHoursFrom')}
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
          <Input
            type="time"
            label={t('settings.quietHoursTo')}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      )}

      <Button className="mt-4" size="sm" isLoading={mutation.isPending} onClick={handleSave}>
        {t('common.save')}
      </Button>
    </Card>
  )
}
