import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { Button, Card, Input } from '../ui'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../../hooks/useCategories'
import { showErrorToast, showSuccessToast } from '../../utils/toast'
import { ApiError } from '../../api/client'
import type { Category } from '../../types/task'

const DEFAULT_COLOR = '#6366f1'

function CategoryRow({ category }: { category: Category }) {
  const { t } = useTranslation()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    updateMutation.mutate(
      { id: category.id, input: { name: trimmed, color } },
      {
        onSuccess: () => {
          showSuccessToast(t('settings.categoryUpdated'))
          setIsEditing(false)
        },
        onError: (error) => {
          showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
        },
      },
    )
  }

  const handleCancel = () => {
    setName(category.name)
    setColor(category.color)
    setIsEditing(false)
  }

  const handleDelete = () => {
    deleteMutation.mutate(category.id, {
      onSuccess: () => showSuccessToast(t('settings.categoryDeleted')),
      onError: (error) => {
        showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
      },
    })
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border p-2">
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label={t('tasks.categoryColor')}
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-surface"
        />
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="flex-1"
          aria-label={t('tasks.categoryName')}
        />
        <Button size="sm" onClick={handleSave} isLoading={updateMutation.isPending}>
          {t('common.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    )
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border p-2.5">
      <span
        className="size-4 shrink-0 rounded-full"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <span className="flex-1 truncate text-sm text-foreground">{category.name}</span>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        aria-label={t('common.edit')}
        className="flex size-8 items-center justify-center rounded-md text-muted opacity-100 transition-colors hover:bg-surface-hover hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        aria-label={t('common.delete')}
        disabled={deleteMutation.isPending}
        className="flex size-8 items-center justify-center rounded-md text-muted opacity-100 transition-colors hover:bg-danger-subtle hover:text-danger disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

function NewCategoryRow() {
  const { t } = useTranslation()
  const createMutation = useCreateCategory()
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    createMutation.mutate(
      { name: trimmed, color },
      {
        onSuccess: () => {
          setName('')
          setColor(DEFAULT_COLOR)
          setIsAdding(false)
        },
        onError: (error) => {
          showErrorToast(error instanceof ApiError ? error.message : t('tasks.loadError'))
        },
      },
    )
  }

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1.5 self-start text-xs font-medium text-primary-600 hover:underline"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t('tasks.newCategory')}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border p-2">
      <input
        type="color"
        value={color}
        onChange={(event) => setColor(event.target.value)}
        aria-label={t('tasks.categoryColor')}
        className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border bg-surface"
      />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('tasks.categoryName')}
        className="flex-1"
        aria-label={t('tasks.categoryName')}
      />
      <Button size="sm" onClick={handleCreate} isLoading={createMutation.isPending}>
        {t('common.add')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
        {t('common.cancel')}
      </Button>
    </div>
  )
}

export function CategoriesSection() {
  const { t } = useTranslation()
  const { data: categories = [], isLoading } = useCategories()

  return (
    <Card title={t('settings.categories')} icon={<Tag className="size-4" aria-hidden="true" />}>
      <p className="-mt-2 mb-3 text-sm text-muted">{t('settings.categoriesDescription')}</p>

      <div className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted">{t('common.loading')}</p>}
        {!isLoading && categories.length === 0 && (
          <p className="text-sm text-muted">{t('settings.noCategories')}</p>
        )}
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
        <NewCategoryRow />
      </div>
    </Card>
  )
}
