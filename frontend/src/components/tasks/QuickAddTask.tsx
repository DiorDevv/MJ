import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button, Input } from '../ui'
import { useCreateTask } from '../../hooks/useTaskMutations'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'
import { todayIsoDate } from '../../utils/date'
import type { Priority } from '../../types/task'

interface QuickAddTaskProps {
  categoryId?: string
  priority?: Priority
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function QuickAddTask({ categoryId, priority }: QuickAddTaskProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const createTaskMutation = useCreateTask()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'n' || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target as HTMLElement
      if (TYPING_TAGS.has(target.tagName) || target.isContentEditable) return
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    createTaskMutation.mutate(
      {
        title: trimmed,
        due_date: todayIsoDate(),
        due_time: '09:00:00',
        category_id: categoryId || null,
        priority,
      },
      {
        onSuccess: () => {
          showSuccessToast(t('tasks.createdSuccess'))
          setTitle('')
        },
        onError: (error) => {
          showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t('tasks.quickAddPlaceholder')}
        aria-label={t('tasks.quickAddPlaceholder')}
        className="flex-1"
      />
      <Button
        type="submit"
        isLoading={createTaskMutation.isPending}
        leftIcon={<Plus className="size-4" aria-hidden="true" />}
      >
        {t('common.add')}
      </Button>
    </form>
  )
}
