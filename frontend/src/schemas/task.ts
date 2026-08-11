import { z } from 'zod'
import type { TFunction } from 'i18next'

export function createTaskSchema(t: TFunction) {
  return z.object({
    title: z.string().min(1, t('validation.required')).max(200, t('validation.titleLength')),
    description: z.string().max(2000, t('validation.descriptionLength')).optional(),
    due_date: z.string().min(1, t('validation.required')),
    due_time: z.string().min(1, t('validation.required')),
    repeat_type: z.enum(['none', 'daily', 'weekly', 'monthly']),
    category_id: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']),
  })
}

export type TaskFormValues = z.infer<ReturnType<typeof createTaskSchema>>
