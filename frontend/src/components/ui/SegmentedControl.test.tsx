import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from './SegmentedControl'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

describe('SegmentedControl', () => {
  it('renders one radio per option and marks the active one', () => {
    render(
      <SegmentedControl options={options} value="b" onChange={() => {}} aria-label="test group" />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Alpha' })).not.toBeChecked()
  })

  it('calls onChange with the clicked value', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl options={options} value="a" onChange={onChange} aria-label="g" />)
    await userEvent.click(screen.getByRole('radio', { name: 'Gamma' }))
    expect(onChange).toHaveBeenCalledWith('c')
  })
})
