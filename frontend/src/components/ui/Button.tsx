import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center rounded-md font-medium transition-[background-color,color,box-shadow,transform] duration-150',
    'active:scale-[0.97]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700',
        secondary:
          'border border-border bg-surface text-foreground hover:bg-surface-hover active:bg-surface-active',
        ghost: 'bg-transparent text-foreground hover:bg-surface-hover active:bg-surface-active',
        danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/90',
      },
      size: {
        sm: 'h-8 gap-1.5 px-3 text-sm',
        md: 'h-9 gap-2 px-4 text-sm',
        lg: 'h-11 gap-2 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  },
)
Button.displayName = 'Button'
