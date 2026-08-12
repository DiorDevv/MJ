import { describe, expect, it, vi } from 'vitest'
import { todayIsoDate } from './date'

describe('todayIsoDate', () => {
  it('returns the local calendar date, not the UTC one', () => {
    // Regression guard for the WeeklyPage-class bug: 00:30 local time in a
    // UTC+5 zone is still 19:30 the PREVIOUS day in UTC. A date built from
    // `new Date().toISOString()` would silently return yesterday's date here.
    vi.setSystemTime(new Date('2026-08-12T00:30:00+05:00'))
    expect(todayIsoDate()).toBe('2026-08-12')
    vi.useRealTimers()
  })

  it('formats as yyyy-MM-dd', () => {
    vi.setSystemTime(new Date('2026-01-05T15:00:00+05:00'))
    expect(todayIsoDate()).toBe('2026-01-05')
    vi.useRealTimers()
  })
})
