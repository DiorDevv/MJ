import { addDays, format } from 'date-fns'
import { todayIsoDate } from './date'
import type { Category, Priority } from '../types/task'

// Mirrors telegram_bot/handlers/quick_add.py's `_parse_quick_add` so the same
// "bugun/ertaga + HH:MM + !priority + #category" free-text shorthand, and the
// same one-line-per-task batching, works identically on the web quick-add
// input and the bot's quick-add message.
const TIME_PATTERN = /\b([01]?\d|2[0-3]):([0-5]\d)\b/
const TOMORROW_PATTERN = /\bertaga\b/i
const TODAY_PATTERN = /\bbugun\b/i

const PRIORITY_KEYWORDS: Record<string, Priority> = {
  past: 'low',
  yuqori: 'high',
  muhim: 'high',
  shoshilinch: 'high',
  orta: 'medium',
  "o'rta": 'medium',
}
const PRIORITY_PATTERN = new RegExp(`!(${Object.keys(PRIORITY_KEYWORDS).join('|')})\\b`, 'i')
const CATEGORY_TAG_PATTERN = /#(\S+)/
const SEGMENT_SPLIT_PATTERN = /[\n,]+/

export interface ParsedQuickAdd {
  dueDate: string
  dueTime: string
  priority: Priority
  category: Category | null
  /** One title per line/comma-separated item; date/time/priority/category are shared. */
  titles: string[]
}

function cleanTitle(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[ ,.-]+/, '')
    .replace(/[ ,.-]+$/, '')
}

export function parseQuickAdd(text: string, categories: Category[] = []): ParsedQuickAdd {
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

  let priority: Priority = 'medium'
  const priorityMatch = remaining.match(PRIORITY_PATTERN)
  const priorityWord = priorityMatch?.[1]?.toLowerCase()
  const matchedPriority = priorityWord ? PRIORITY_KEYWORDS[priorityWord] : undefined
  if (priorityMatch && matchedPriority) {
    priority = matchedPriority
    remaining = remaining.replace(priorityMatch[0], '')
  }

  let category: Category | null = null
  const categoryMatch = remaining.match(CATEGORY_TAG_PATTERN)
  const tag = categoryMatch?.[1]?.toLowerCase()
  if (categoryMatch && tag) {
    const matched = categories.find((c) => c.name.toLowerCase() === tag)
    if (matched) {
      category = matched
      remaining = remaining.replace(categoryMatch[0], '')
    }
  }

  let titles = remaining
    .split(SEGMENT_SPLIT_PATTERN)
    .map(cleanTitle)
    .filter((title) => title.length > 0)
  if (titles.length === 0) titles = [text.trim()]

  return { dueDate, dueTime, priority, category, titles }
}
