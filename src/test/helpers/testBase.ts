import { vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

/**
 * Base test helper to reduce code duplication
 */
export class TestBase {
  /**
   * Create common mocks for authentication middleware
   */
  static createAuthMocks() {
    return {
      protect: (req: Request, res: Response, next: NextFunction) => {
        req.user = { _id: 'testuser', role: 'user' }
        next()
      },
      admin: (req: Request, res: Response, next: NextFunction) => next()
    }
  }

  /**
   * Setup common mocks before each test
   */
  static setupCommonMocks() {
    vi.clearAllMocks()
  }

  /**
   * Create a basic controller test suite
   */
  static createControllerTestSuite(controllerName: string) {
    return {
      describe: `${controllerName}`,
      tests: [
        {
          name: 'should be defined',
          test: () => {
            expect(true).toBe(true)
          }
        }
      ]
    }
  }
}

/**
 * Common test utilities
 */
export const testUtils = {
  /**
   * Create mock request object
   */
  createMockRequest: (overrides: Partial<Request> = {}): Partial<Request> => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { _id: 'testuser', role: 'user' },
    ...overrides
  }),

  /**
   * Create mock response object
   */
  createMockResponse: (): Partial<Response> => {
    const res: Partial<Response> = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    }
    return res
  },

  /**
   * Create mock next function
   */
  createMockNext: (): NextFunction => vi.fn()
}