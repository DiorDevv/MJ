import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressRing } from './ProgressRing'

describe('ProgressRing', () => {
  it('exposes the percentage via an aria-label and renders its centre content', () => {
    render(
      <ProgressRing value={0.42}>
        <span>42%</span>
      </ProgressRing>,
    )
    expect(screen.getByRole('img', { name: '42%' })).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('clamps out-of-range and non-finite values', () => {
    const { rerender } = render(<ProgressRing value={5} label="over" />)
    expect(screen.getByRole('img', { name: 'over' })).toBeInTheDocument()
    rerender(<ProgressRing value={Number.NaN} />)
    expect(screen.getByRole('img', { name: '0%' })).toBeInTheDocument()
  })
})
