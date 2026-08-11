import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCategory, fetchCategories, type CategoryInput } from '../api/categories'

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
