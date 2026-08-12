import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type CategoryInput,
} from '../api/categories'
import { TASKS_QUERY_KEY } from './useTasks'

const CATEGORIES_QUERY_KEY = 'categories' as const

export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: fetchCategories,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) =>
      updateCategory(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
      // Task cards embed the category's name/color, so a rename/recolor must
      // also refresh any already-cached task lists to avoid showing stale ones.
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] })
      void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] })
    },
  })
}
