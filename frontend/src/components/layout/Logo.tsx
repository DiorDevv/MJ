import { cn } from '../../utils/cn'

interface LogoProps {
  /** Rendered square size in px. */
  size?: number
  className?: string
}

/** The MJ mark (public/favicon.svg). Used wherever the app brands itself —
 * sidebar, mobile top bar, the auth screens. */
export function Logo({ size = 28, className }: LogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt="MJ"
      width={size}
      height={size}
      className={cn('shrink-0 select-none', className)}
      draggable={false}
    />
  )
}
