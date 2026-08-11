import { Toaster } from 'react-hot-toast'

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        className: '!bg-surface !text-foreground !border !border-border',
      }}
    />
  )
}
