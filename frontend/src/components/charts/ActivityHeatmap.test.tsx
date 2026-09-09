import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityHeatmap } from './ActivityHeatmap'
import type { ActivityDay } from '../../types/stats'

function range(days: number): ActivityDay[] {
  const start = new Date('2026-01-01')
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return { date: d.toISOString().slice(0, 10), completed: i % 4, created: 1 }
  })
}

describe('ActivityHeatmap', () => {
  it('shows an empty message with no data', () => {
    render(<ActivityHeatmap days={[]} />)
    expect(screen.getByText(/faollik/i)).toBeInTheDocument()
  })

  it('renders one labelled cell per day', () => {
    const { container } = render(<ActivityHeatmap days={range(21)} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    const cells = container.querySelectorAll('rect[aria-label]')
    expect(cells.length).toBe(21)
  })
})
