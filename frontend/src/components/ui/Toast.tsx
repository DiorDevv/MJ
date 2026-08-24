import * as ToastPrimitive from '@radix-ui/react-toast'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToastStore, type ToastItem, type ToastVariant } from '../../store/toastStore'
import { cn } from '../../utils/cn'

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const ICON_CLASS: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
}

function ToastEntry({ toast }: { toast: ToastItem }) {
  const { t } = useTranslation()
  const dismiss = useToastStore((state) => state.dismiss)
  const Icon = ICONS[toast.variant]

  return (
    <ToastPrimitive.Root
      duration={toast.duration}
      onOpenChange={(open) => {
        if (!open) dismiss(toast.id)
      }}
      className={cn(
        'toast-root pointer-events-auto flex items-center gap-3 rounded-md border border-border',
        'bg-surface-hover px-4 py-3 shadow-lg',
      )}
    >
      <Icon className={cn('size-5 shrink-0', ICON_CLASS[toast.variant])} aria-hidden="true" />
      <ToastPrimitive.Description className="flex-1 text-sm text-foreground">
        {toast.message}
      </ToastPrimitive.Description>
      {toast.action && (
        <ToastPrimitive.Action asChild altText={toast.action.label}>
          <button
            type="button"
            onClick={toast.action.onClick}
            className="shrink-0 rounded px-1 text-sm font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {toast.action.label}
          </button>
        </ToastPrimitive.Action>
      )}
      <ToastPrimitive.Close
        aria-label={t('common.close')}
        className="shrink-0 rounded text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <X className="size-4" aria-hidden="true" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

export function AppToaster() {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <ToastEntry key={toast.id} toast={toast} />
      ))}
      <ToastPrimitive.Viewport className="fixed inset-x-4 bottom-4 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 outline-none sm:right-4 sm:left-auto" />
    </ToastPrimitive.Provider>
  )
}
