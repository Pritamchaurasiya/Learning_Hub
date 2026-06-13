export const parseJsonObject = (value: unknown): Record<string, unknown> => {
  if (!value) return {}

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parseJsonObject(parsed)
    } catch {
      return {}
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

export const parseJsonArray = <T = unknown>(value: unknown): T[] => {
  if (!value) return []

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parseJsonArray<T>(parsed)
    } catch {
      return []
    }
  }

  return Array.isArray(value) ? (value as T[]) : []
}
