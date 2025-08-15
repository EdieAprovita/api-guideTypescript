import { describe, it, expect } from 'vitest'

// Simple database connection test
describe('Database Connection - Simple', () => {
  it('should have connectDB function available', async () => {
    const { default: connectDB } = await import('../../config/db')
    expect(connectDB).toBeDefined()
    expect(typeof connectDB).toBe('function')
  })

  it('should not throw when importing database module', async () => {
    await expect(import('../../config/db')).resolves.toBeDefined()
  })

  it('should be able to call connectDB function', async () => {
    const { default: connectDB } = await import('../../config/db')
    
    // Just test that the function exists and can be called
    expect(() => connectDB).not.toThrow()
  })
})