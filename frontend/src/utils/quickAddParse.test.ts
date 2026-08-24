import { describe, expect, it, vi } from 'vitest'
import { parseQuickAdd } from './quickAddParse'
import type { Category } from '../types/task'

const CATEGORIES: Category[] = [
  { id: 'cat-uy', name: 'Uy', color: '#000000' },
  { id: 'cat-ish', name: 'Ish', color: '#ffffff' },
]

describe('parseQuickAdd', () => {
  it('defaults to today at 09:00, medium priority, no category', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    expect(parseQuickAdd('Sut sotib olish')).toEqual({
      dueDate: '2026-08-12',
      dueTime: '09:00:00',
      priority: 'medium',
      category: null,
      titles: ['Sut sotib olish'],
    })
    vi.useRealTimers()
  })

  it('recognizes "ertaga" and shifts the date by one day', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    const result = parseQuickAdd('ertaga shifokorga borish')
    expect(result.dueDate).toBe('2026-08-13')
    expect(result.titles).toEqual(['shifokorga borish'])
    vi.useRealTimers()
  })

  it('extracts an HH:MM time and strips it from the title', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    const result = parseQuickAdd('ertaga 14:00 shifokorga borish')
    expect(result.dueTime).toBe('14:00:00')
    expect(result.titles).toEqual(['shifokorga borish'])
    vi.useRealTimers()
  })

  it('extracts a priority marker', () => {
    expect(parseQuickAdd('!muhim hisobot topshirish').priority).toBe('high')
    expect(parseQuickAdd('!past kitob oqish').priority).toBe('low')
    expect(parseQuickAdd('oddiy vazifa').priority).toBe('medium')
  })

  it('matches a #tag against an existing category case-insensitively', () => {
    const result = parseQuickAdd('#uy kir yuvish', CATEGORIES)
    expect(result.category).toEqual(CATEGORIES[0])
    expect(result.titles).toEqual(['kir yuvish'])
  })

  it('leaves an unmatched #tag in the title instead of silently dropping it', () => {
    const result = parseQuickAdd('#nomavjud narsa', CATEGORIES)
    expect(result.category).toBeNull()
    expect(result.titles).toEqual(['#nomavjud narsa'])
  })

  it('splits comma-separated text into multiple titles sharing one date/time', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    const result = parseQuickAdd(
      'ertaga 18:00 !muhim #uy sut olish, non olish, kir yuvish',
      CATEGORIES,
    )
    expect(result.dueDate).toBe('2026-08-13')
    expect(result.dueTime).toBe('18:00:00')
    expect(result.priority).toBe('high')
    expect(result.category).toEqual(CATEGORIES[0])
    expect(result.titles).toEqual(['sut olish', 'non olish', 'kir yuvish'])
    vi.useRealTimers()
  })

  it('falls back to the original text when stripping keywords leaves nothing', () => {
    vi.setSystemTime(new Date('2026-08-12T10:00:00+05:00'))
    expect(parseQuickAdd('ertaga').titles).toEqual(['ertaga'])
    vi.useRealTimers()
  })
})
