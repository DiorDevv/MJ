import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button, Dropdown, Input, Modal, Textarea } from '../ui'
import type { DropdownOption } from '../ui'
import { createTaskSchema, type TaskFormValues } from '../../schemas/task'
import { useCategories, useCreateCategory } from '../../hooks/useCategories'
import { useCreateTask, useUpdateTask } from '../../hooks/useTaskMutations'
import type { TaskInput } from '../../api/tasks'
import type { Task } from '../../types/task'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'
import { todayIsoDate } from '../../utils/date'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: Task | null
  defaultDate?: string
}

const DEFAULT_COLOR = '#6366f1'

function formValuesFor(task: Task | null | undefined, defaultDate?: string): TaskFormValues {
  if (!task) {
    return {
      title: '',
      description: '',
      due_date: defaultDate ?? todayIsoDate(),
      due_time: '09:00',
      repeat_type: 'none',
      category_id: '',
      priority: 'medium',
    }
  }
  return {
    title: task.title,
    description: task.description ?? '',
    due_date: task.due_date,
    due_time: task.due_time.slice(0, 5),
    repeat_type: task.repeat_type,
    category_id: task.category?.id ?? '',
    priority: task.priority,
  }
}

export function TaskModal({ isOpen, onClose, task, defaultDate }: TaskModalProps) {
  const { t } = useTranslation()
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t(task ? 'tasks.editTask' : 'tasks.addTask')}>
      {isOpen && (
        <TaskForm key={task?.id ?? 'new'} task={task} defaultDate={defaultDate} onClose={onClose} />
      )}
    </Modal>
  )
}

interface TaskFormProps {
  task?: Task | null
  defaultDate?: string
  onClose: () => void
}

function TaskForm({ task, defaultDate, onClose }: TaskFormProps) {
  const { t } = useTranslation()
  const isEditing = Boolean(task)
  const { data: categories = [] } = useCategories()
  const createCategoryMutation = useCreateCategory()
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(DEFAULT_COLOR)

  const schema = createTaskSchema(t)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: formValuesFor(task, defaultDate),
  })

  const repeatOptions: DropdownOption<TaskFormValues['repeat_type']>[] = [
    { value: 'none', label: t('tasks.repeat_none') },
    { value: 'daily', label: t('tasks.repeat_daily') },
    { value: 'weekly', label: t('tasks.repeat_weekly') },
    { value: 'monthly', label: t('tasks.repeat_monthly') },
  ]

  const priorityOptions: DropdownOption<TaskFormValues['priority']>[] = [
    { value: 'low', label: t('tasks.priority_low') },
    { value: 'medium', label: t('tasks.priority_medium') },
    { value: 'high', label: t('tasks.priority_high') },
  ]

  const categoryOptions: DropdownOption<string>[] = [
    { value: '', label: t('tasks.noCategory') },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ]

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const created = await createCategoryMutation.mutateAsync({
        name: newCategoryName.trim(),
        color: newCategoryColor,
      })
      setValue('category_id', created.id)
      setShowNewCategory(false)
      setNewCategoryName('')
    } catch (error) {
      showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
    }
  }

  const isSaving = createTaskMutation.isPending || updateTaskMutation.isPending

  const onSubmit = (values: TaskFormValues) => {
    const input: TaskInput = {
      title: values.title,
      description: values.description || null,
      due_date: values.due_date,
      due_time: `${values.due_time}:00`,
      repeat_type: values.repeat_type,
      category_id: values.category_id || null,
      priority: values.priority,
    }

    const onSuccess = () => {
      showSuccessToast(t(isEditing ? 'tasks.updatedSuccess' : 'tasks.createdSuccess'))
      onClose()
    }
    const onError = (error: unknown) => {
      showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
    }

    if (isEditing && task) {
      updateTaskMutation.mutate({ id: task.id, input }, { onSuccess, onError })
    } else {
      createTaskMutation.mutate(input, { onSuccess, onError })
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex flex-col gap-4">
      <Input
        label={t('tasks.title')}
        placeholder={t('tasks.titlePlaceholder')}
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label={t('tasks.description')}
        placeholder={t('tasks.descriptionPlaceholder')}
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          label={t('tasks.dueDate')}
          error={errors.due_date?.message}
          {...register('due_date')}
        />
        <Input
          type="time"
          label={t('tasks.dueTime')}
          error={errors.due_time?.message}
          {...register('due_time')}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="repeat_type"
          render={({ field }) => (
            <Dropdown
              label={t('tasks.repeatType')}
              options={repeatOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Dropdown
              label={t('tasks.priority')}
              options={priorityOptions}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Controller
          control={control}
          name="category_id"
          render={({ field }) => (
            <Dropdown
              label={t('tasks.category')}
              options={categoryOptions}
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          )}
        />
        {!showNewCategory ? (
          <button
            type="button"
            onClick={() => setShowNewCategory(true)}
            className="self-start text-xs font-medium text-primary-600 hover:underline"
          >
            {t('tasks.newCategory')}
          </button>
        ) : (
          <div className="flex items-end gap-2">
            <Input
              label={t('tasks.categoryName')}
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              className="flex-1"
            />
            <input
              type="color"
              value={newCategoryColor}
              onChange={(event) => setNewCategoryColor(event.target.value)}
              aria-label={t('tasks.categoryColor')}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border bg-surface"
            />
            <Button
              type="button"
              size="md"
              onClick={() => void handleCreateCategory()}
              isLoading={createCategoryMutation.isPending}
            >
              {t('common.add')}
            </Button>
          </div>
        )}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" isLoading={isSaving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
