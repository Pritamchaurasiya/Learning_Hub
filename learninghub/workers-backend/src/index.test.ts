import { describe, expect, it } from 'vitest'
import { normalizeApiPath } from './index'

describe('normalizeApiPath', () => {
  it('keeps bare Worker routes unchanged', () => {
    expect(normalizeApiPath('/tests')).toBe('/tests')
    expect(normalizeApiPath('/tests/abc/start')).toBe('/tests/abc/start')
  })

  it('strips the production /api/v1 prefix', () => {
    expect(normalizeApiPath('/api/v1')).toBe('/')
    expect(normalizeApiPath('/api/v1/health')).toBe('/health')
    expect(normalizeApiPath('/api/v1/tests/abc/submit')).toBe('/tests/abc/submit')
  })
})
