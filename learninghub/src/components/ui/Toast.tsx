import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import type { Toast as ToastType } from '../../types'

export function Toast({ toast }: { toast: ToastType }) {
  const { removeToast } = useStore()

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  }

  const bgColors = {
    success: 'bg-white/90 dark:bg-gray-800/90 border-emerald-200/60 dark:border-emerald-700/40',
    error: 'bg-white/90 dark:bg-gray-800/90 border-red-200/60 dark:border-red-700/40',
    warning: 'bg-white/90 dark:bg-gray-800/90 border-amber-200/60 dark:border-amber-700/40',
    info: 'bg-white/90 dark:bg-gray-800/90 border-blue-200/60 dark:border-blue-700/40',
  }

  const accentColors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  }

  return (
    <div className={`
      flex items-center gap-3 p-4 rounded-xl border backdrop-blur-xl
      shadow-xl shadow-black/5 dark:shadow-black/20
      toast-enter overflow-hidden relative
      ${bgColors[toast.type]}
    `}>
      {/* Accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${accentColors[toast.type]}`} />

      <div className="pl-2">
        {icons[toast.type]}
      </div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">
        {toast.message}
      </p>
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-auto p-1.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5 text-gray-400" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useStore()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  )
}
