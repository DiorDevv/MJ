import { useToastStore } from '../store/toastStore'

export function showSuccessToast(message: string): void {
  useToastStore.getState().push({ message, variant: 'success', duration: 4000 })
}

export function showErrorToast(message: string): void {
  useToastStore.getState().push({ message, variant: 'error', duration: 5000 })
}

export function showUndoToast(message: string, undoLabel: string, onUndo: () => void): void {
  useToastStore.getState().push({
    message,
    variant: 'info',
    duration: 5000,
    action: { label: undoLabel, onClick: onUndo },
  })
}
