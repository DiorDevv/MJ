import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Wraps a route's content with a small enter transition so navigation between
 * pages feels intentional rather than instant. Keep the vertical rhythm
 * (`gap-6`) that every page already used here so pages don't each repeat it. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {children}
    </motion.div>
  )
}
