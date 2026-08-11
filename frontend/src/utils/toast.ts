import { createElement } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle } from 'lucide-react'

export function showSuccessToast(message: string): void {
  toast.success(message, {
    icon: createElement(CheckCircle2, {
      className: 'size-5 text-emerald-500',
      'aria-hidden': true,
    }),
  })
}

export function showErrorToast(message: string): void {
  toast.error(message, {
    icon: createElement(XCircle, { className: 'size-5 text-red-500', 'aria-hidden': true }),
  })
}

export function showUndoToast(message: string, undoLabel: string, onUndo: () => void): void {
  toast(
    (activeToast) =>
      createElement(
        'div',
        { className: 'flex items-center gap-3' },
        createElement('span', null, message),
        createElement(
          'button',
          {
            type: 'button',
            className: 'font-semibold text-primary-600 hover:underline',
            onClick: () => {
              onUndo()
              toast.dismiss(activeToast.id)
            },
          },
          undoLabel,
        ),
      ),
    { duration: 5000 },
  )
}
