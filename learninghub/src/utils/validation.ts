export interface ValidationRule {
  validate: (value: unknown) => boolean
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value !== null && value !== undefined && value !== '',
    message
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => typeof value === 'string' && value.length >= min,
    message: message || `Must be at least ${min} characters`
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => typeof value === 'string' && value.length <= max,
    message: message || `Must be at most ${max} characters`
  }),

  email: (message = 'Invalid email address'): ValidationRule => ({
    validate: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),

  url: (message = 'Invalid URL'): ValidationRule => ({
    validate: (value) => {
      try {
        new URL(value as string)
        return true
      } catch {
        return false
      }
    },
    message
  }),

  min: (min: number, message?: string): ValidationRule => ({
    validate: (value) => typeof value === 'number' && value >= min,
    message: message || `Must be at least ${min}`
  }),

  max: (max: number, message?: string): ValidationRule => ({
    validate: (value) => typeof value === 'number' && value <= max,
    message: message || `Must be at most ${max}`
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => regex.test(value as string),
    message
  }),

  oneOf: (options: unknown[], message?: string): ValidationRule => ({
    validate: (value) => options.includes(value),
    message: message || `Must be one of: ${options.join(', ')}`
  })
}

export function validate(value: unknown, rules: ValidationRule[]): ValidationResult {
  const errors: Record<string, string> = {}

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors[Object.keys(errors).length] = rule.message
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export function validateForm(
  data: Record<string, unknown>,
  schema: Record<string, ValidationRule[]>
): ValidationResult {
  const errors: Record<string, string> = {}

  for (const [field, rules] of Object.entries(schema)) {
    const result = validate(data[field], rules)
    if (!result.isValid) {
      errors[field] = Object.values(result.errors)[0]
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}