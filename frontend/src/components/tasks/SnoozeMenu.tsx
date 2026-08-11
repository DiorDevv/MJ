import { useEffect, useRef, useState } from 'react'
import { AlarmClock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSnoozeTask } from '../../hooks/useTaskMutations'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'

interface SnoozeMenuProps {
  taskId: string
}

const PRESETS = ['15m', '1h', 'tomorrow'] as const
const PRESET_LABEL_KEYS: Record<(typeof PRESETS)[number], string> = {
  '15m': 'tasks.snooze15m',
  '1h': 'tasks.snooze1h',
  tomorrow: 'tasks.snoozeTomorrow',
}

export function SnoozeMenu({ taskId }: SnoozeMenuProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const snoozeMutation = useSnoozeTask()

  useEffect(() => {
    if (!isOpen) return
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isOpen])

  const handleSnooze = (preset: (typeof PRESETS)[number]) => {
    snoozeMutation.mutate(
      { id: taskId, input: { preset } },
      {
        onSuccess: () => showSuccessToast(t('tasks.snoozedSuccess')),
        onError: (error) => {
          showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
        },
      },
    )
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('tasks.snooze')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground"
      >
        <AlarmClock className="size-4" aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              role="menuitem"
              onClick={() => handleSnooze(preset)}
              className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-hover"
            >
              {t(PRESET_LABEL_KEYS[preset])}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
