import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from '../test/utils'
import { StatsPage } from './StatsPage'

vi.mock('../hooks/useStats', () => ({
  useStats: () => ({
    data: {
      period: 'weekly',
      completed: 6,
      pending: 4,
      total: 10,
      completion_rate: 0.6,
      by_category: [{ category_id: 'c1', name: 'Ish', color: '#f00', count: 4 }],
      by_priority: [
        { priority: 'high', count: 3 },
        { priority: 'medium', count: 5 },
        { priority: 'low', count: 2 },
      ],
    },
    isLoading: false,
  }),
  useActivity: () => ({
    data: { days: [{ date: '2026-01-01', completed: 2, created: 3 }] },
    isLoading: false,
  }),
  useStreak: () => ({ data: { current: 5, longest: 12 }, isLoading: false }),
}))

describe('StatsPage', () => {
  it('renders the streak, completion rate and chart cards', () => {
    renderWithProviders(
      <MemoryRouter>
        <StatsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('5')).toBeInTheDocument() // current streak
    expect(screen.getByText('60%')).toBeInTheDocument() // completion rate
    expect(screen.getByRole('heading', { name: /tendensiya/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /muhimlik/i })).toBeInTheDocument()
  })
})
