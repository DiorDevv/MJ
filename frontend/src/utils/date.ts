import { format } from 'date-fns'

export function todayIsoDate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
