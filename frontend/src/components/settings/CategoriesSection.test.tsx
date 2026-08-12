import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { CategoriesSection } from './CategoriesSection'
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../../api/categories'
import type { Category } from '../../types/task'

vi.mock('../../api/categories', () => ({
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

const mockedFetchCategories = vi.mocked(fetchCategories)
const mockedCreateCategory = vi.mocked(createCategory)
const mockedUpdateCategory = vi.mocked(updateCategory)
const mockedDeleteCategory = vi.mocked(deleteCategory)

const WORK: Category = { id: 'cat-1', name: 'Ish', color: '#4f46e5' }

describe('CategoriesSection', () => {
  beforeEach(() => {
    mockedFetchCategories.mockReset()
    mockedCreateCategory.mockReset()
    mockedUpdateCategory.mockReset()
    mockedDeleteCategory.mockReset()
  })

  it('shows an empty state when there are no categories', async () => {
    mockedFetchCategories.mockResolvedValue([])
    renderWithProviders(<CategoriesSection />)

    expect(await screen.findByText(/hali kategoriya yo'q/i)).toBeInTheDocument()
  })

  it('lists existing categories with their color and name', async () => {
    mockedFetchCategories.mockResolvedValue([WORK])
    renderWithProviders(<CategoriesSection />)

    expect(await screen.findByText('Ish')).toBeInTheDocument()
  })

  it('creates a new category from the inline form', async () => {
    mockedFetchCategories.mockResolvedValue([])
    mockedCreateCategory.mockResolvedValue({ id: 'cat-2', name: 'Uy', color: '#6366f1' })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesSection />)

    await user.click(await screen.findByText(/yangi kategoriya/i))
    await user.type(screen.getByLabelText(/kategoriya nomi/i), 'Uy')
    await user.click(screen.getByRole('button', { name: /qo'shish/i }))

    await waitFor(() =>
      expect(mockedCreateCategory).toHaveBeenCalledWith(expect.objectContaining({ name: 'Uy' })),
    )
  })

  it('saves an edited name', async () => {
    mockedFetchCategories.mockResolvedValue([WORK])
    mockedUpdateCategory.mockResolvedValue({ ...WORK, name: 'Ish (yangi)' })
    const user = userEvent.setup()
    renderWithProviders(<CategoriesSection />)

    await screen.findByText('Ish')
    // Clicking edit swaps the row's DOM entirely (view -> inline form), so the
    // fields below are queried unscoped rather than via a now-stale row handle.
    await user.click(screen.getByLabelText(/tahrirlash/i))

    const nameInput = screen.getByLabelText(/kategoriya nomi/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Ish (yangi)')
    await user.click(screen.getByRole('button', { name: /saqlash/i }))

    await waitFor(() =>
      expect(mockedUpdateCategory).toHaveBeenCalledWith(
        'cat-1',
        expect.objectContaining({ name: 'Ish (yangi)' }),
      ),
    )
  })

  it('deletes a category', async () => {
    mockedFetchCategories.mockResolvedValue([WORK])
    mockedDeleteCategory.mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithProviders(<CategoriesSection />)

    const row = (await screen.findByText('Ish')).closest('div') as HTMLElement
    await user.click(within(row).getByLabelText(/o'chirish/i))

    await waitFor(() => expect(mockedDeleteCategory).toHaveBeenCalledWith('cat-1'))
  })
})
