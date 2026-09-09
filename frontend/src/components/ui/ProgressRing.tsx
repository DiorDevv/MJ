import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

interface ProgressRingProps {
  /** 0–1. */
  value: number
  size?: number
  strokeWidth?: number
  /** Centre content (a percentage, a count). */
  children?: ReactNode
  /** Tailwind text-color class for the arc (defaults to the accent). */
  trackClassName?: string
  className?: string
  label?: string
}

/** SVG completion ring — the arc length is driven by stroke-dashoffset so it
 * animates for free via the CSS transition. Used for the Daily hero and the
 * Stats completion card. */
export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  children,
  trackClassName = 'text-accent',
  className,
  label,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped)

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(clamped * 100)}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="text-border-strong"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-700 ease-out', trackClassName)}
          stroke="currentColor"
        />
      </svg>
      {children != null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  )
}
