import { describe, expect, it, vi } from 'vitest'
import { parseQuickAdd } from './quickAddParse'

describe('parseQuickAdd', () => {
  it('defaults to today at 09:00 when no date/time is present', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    expect(parseQuickAdd('Sut sotib olish')).toEqual({
      dueDate: '2026-08-12',
      dueTime: '09:00:00',
      title: 'Sut sotib olish',
    })
    vi.useRealTimers()
  })

  it('recognizes "ertaga" and shifts the date by one day', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    expect(parseQuickAdd('ertaga shifokorga borish')).toEqual({
      dueDate: '2026-08-13',
      dueTime: '09:00:00',
      title: 'shifokorga borish',
    })
    vi.useRealTimers()
  })

  it('extracts an HH:MM time and strips it from the title', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    expect(parseQuickAdd('ertaga 14:00 shifokorga borish')).toEqual({
      dueDate: '2026-08-13',
      dueTime: '14:00:00',
      title: 'shifokorga borish',
    })
    vi.useRealTimers()
  })

  it('ignores an explicit "bugun" and keeps today\'s date', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    expect(parseQuickAdd('bugun 18:30 trenajyor zali')).toEqual({
      dueDate: '2026-08-12',
      dueTime: '18:30:00',
      title: 'trenajyor zali',
    })
    vi.useRealTimers()
  })

  it('falls back to the original text when stripping keywords leaves nothing', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    expect(parseQuickAdd('ertaga')).toEqual({
      dueDate: '2026-08-13',
      dueTime: '09:00:00',
      title: 'ertaga',
    })
    vi.useRealTimers()
  })
})
