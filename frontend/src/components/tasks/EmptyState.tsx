import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Inbox, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  body?: string
  action?: ReactNode
  icon?: LucideIcon
}

export function EmptyState({ title, body, action, icon: Icon = Inbox }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface/50 px-6 py-16 text-center"
    >
      <div className="mb-1 flex size-12 items-center justify-center rounded-md bg-accent-subtle text-accent">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <p className="text-lg font-medium text-foreground">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}
