import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { TaskModal } from './TaskModal'
import { fetchCategories } from '../../api/categories'
import { todayIsoDate } from '../../utils/date'

vi.mock('../../api/categories', () => ({
  fetchCategories: vi.fn(),
  createCategory: vi.fn(),
}))

const mockedFetchCategories = vi.mocked(fetchCategories)

describe('TaskModal', () => {
  beforeEach(() => {
    mockedFetchCategories.mockReset()
    mockedFetchCategories.mockResolvedValue([])
  })

  // Regression test for the WeeklyPage bug: each day column's "+" button must
  // pre-fill the due date with the clicked day, not silently fall back to today.
  it('pre-fills the due date with the explicitly passed defaultDate', () => {
    renderWithProviders(
      <TaskModal isOpen onClose={() => {}} task={null} defaultDate="2026-08-19" />,
    )
    const dateInput = screen.getByLabelText(/sana/i) as HTMLInputElement
    expect(dateInput.value).toBe('2026-08-19')
  })

  it('falls back to the local today when no defaultDate is given', () => {
    renderWithProviders(<TaskModal isOpen onClose={() => {}} task={null} />)
    const dateInput = screen.getByLabelText(/sana/i) as HTMLInputElement
    expect(dateInput.value).toBe(todayIsoDate())
  })

  it('uses the task’s own due date when editing an existing task', () => {
    renderWithProviders(
      <TaskModal
        isOpen
        onClose={() => {}}
        defaultDate="2026-08-19"
        task={{
          id: 't1',
          title: 'Mavjud vazifa',
          description: null,
          due_date: '2026-09-01',
          due_time: '10:00:00',
          repeat_type: 'none',
          category: null,
          priority: 'medium',
          status: 'pending',
          snoozed_until: null,
          created_via: 'web',
          has_voice_note: false,
          created_at: '2026-08-12T00:00:00Z',
          updated_at: '2026-08-12T00:00:00Z',
        }}
      />,
    )
    const dateInput = screen.getByLabelText(/sana/i) as HTMLInputElement
    expect(dateInput.value).toBe('2026-09-01')
  })
})
