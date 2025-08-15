import { describe, it, expect } from 'vitest'

describe('Server Core - Simple', () => {
  it('should be able to import app module', async () => {
    await expect(import('../app')).resolves.toBeDefined()
  })

  it('should export app from module', async () => {
    const appModule = await import('../app')
    expect(appModule).toBeDefined()
    expect(typeof appModule).toBe('object')
  })

  it('should not throw when importing server modules', async () => {
    // Test that basic imports work
    await expect(import('../app')).resolves.not.toThrow()
  })

  it('should have required environment for tests', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})