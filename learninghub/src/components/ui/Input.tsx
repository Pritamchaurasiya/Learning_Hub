import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique ID if not provided to prevent collisions with same labels
    const generatedId = label?.toLowerCase().replace(/\s+/g, '-')
    const inputId =
      id ??
      (generatedId
        ? `input-${generatedId}-${Math.random().toString(36).slice(2, 8)}`
        : `input-${Math.random().toString(36).slice(2, 8)}`)
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    return (
      <div className={cn('space-y-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</div>
          )}
          <input
            ref={ref}
            type={type}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-errormessage={error ? errorId : undefined}
            aria-describedby={!error && helperText ? helperId : undefined}
            className={cn(
              // Base styles
              'flex h-11 w-full min-h-[44px] rounded-lg border bg-white dark:bg-gray-900 px-3 py-2 text-sm',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-colors duration-200',
              '[@media(pointer:coarse)]:min-h-[48px]',
              // Icon padding
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              // Error state
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-200 dark:border-gray-700',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
