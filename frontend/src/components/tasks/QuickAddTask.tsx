import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button, Input } from '../ui'
import { createTask } from '../../api/tasks'
import { TASKS_QUERY_KEY } from '../../hooks/useTasks'
import { useCategories } from '../../hooks/useCategories'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'
import { parseQuickAdd } from '../../utils/quickAddParse'
import type { Priority } from '../../types/task'

interface QuickAddTaskProps {
  categoryId?: string
  priority?: Priority
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function QuickAddTask({ categoryId, priority }: QuickAddTaskProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: categories = [] } = useCategories()
  const queryClient = useQueryClient()
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || isSubmitting) return

    // #tag/!priority in the text override the page's active filter defaults;
    // the filter defaults only fill in what the shorthand didn't specify.
    const parsed = parseQuickAdd(title, categories)
    setIsSubmitting(true)
    try {
      await Promise.all(
        parsed.titles.map((parsedTitle) =>
          createTask({
            title: parsedTitle,
            due_date: parsed.dueDate,
            due_time: parsed.dueTime,
            category_id: parsed.category ? parsed.category.id : categoryId || null,
            priority: parsed.priority !== 'medium' ? parsed.priority : priority,
          }),
        ),
      )
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
      showSuccessToast(
        parsed.titles.length > 1
          ? t('tasks.createdMultipleSuccess', { count: parsed.titles.length })
          : t('tasks.createdSuccess'),
      )
      setTitle('')
    } catch (error) {
      showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <form onSubmit={(event) => void handleSubmit(event)} className="flex gap-2">
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
          isLoading={isSubmitting}
          leftIcon={<Plus className="size-4" aria-hidden="true" />}
        >
          {t('common.add')}
        </Button>
      </form>
      <p className="px-1 text-xs text-muted">{t('tasks.quickAddHint')}</p>
    </div>
  )
}
