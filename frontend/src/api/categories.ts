import { authorizedRequest } from './authorizedRequest'
import type { Category } from '../types/task'

export function fetchCategories(): Promise<Category[]> {
  return authorizedRequest<Category[]>('/v1/categories')
}

export interface CategoryInput {
  name: string
  color: string
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return authorizedRequest<Category>('/v1/categories', { method: 'POST', body: input })
}

export function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  return authorizedRequest<Category>(`/v1/categories/${id}`, { method: 'PATCH', body: input })
}

export function deleteCategory(id: string): Promise<void> {
  return authorizedRequest<void>(`/v1/categories/${id}`, { method: 'DELETE' })
}
