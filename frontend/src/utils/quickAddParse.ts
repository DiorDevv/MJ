import { addDays, format } from 'date-fns'
import { todayIsoDate } from './date'

// Mirrors telegram_bot/handlers/quick_add.py's `_extract_date_time_title` so the
// same "bugun/ertaga + HH:MM" free-text shorthand works identically on both the
// web quick-add input and the bot's quick-add message.
// Deliberately non-global: these are only ever used with .test()/.exec(), which
// are stateful (track lastIndex) on a global regex and would silently break on
// the second call reusing this same module-level object.
const TIME_PATTERN = /\b([01]?\d|2[0-3]):([0-5]\d)\b/
const TOMORROW_PATTERN = /\bertaga\b/i
const TODAY_PATTERN = /\bbugun\b/i

export interface ParsedQuickAdd {
  dueDate: string
  dueTime: string
  title: string
}

export function parseQuickAdd(text: string): ParsedQuickAdd {
  let remaining = text
  let dueDate = todayIsoDate()

  if (TOMORROW_PATTERN.test(remaining)) {
    dueDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    remaining = remaining.replace(TOMORROW_PATTERN, '')
  } else {
    remaining = remaining.replace(TODAY_PATTERN, '')
  }

  let dueTime = '09:00:00'
  const timeMatch = remaining.match(TIME_PATTERN)
  if (timeMatch) {
    dueTime = `${timeMatch[0]}:00`
    remaining = remaining.replace(timeMatch[0], '')
  }

  const title = remaining
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[ ,.-]+/, '')
    .replace(/[ ,.-]+$/, '')

  return { dueDate, dueTime, title: title || text.trim() }
}
