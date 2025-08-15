import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { app, server } from '../server'

describe('Server Core', () => {
  afterAll(async () => {
    if (server.listening) {
      server.close()
    }
  })

  describe('Server Startup', () => {
    it('should start server on correct port', async () => {
      expect(server.listening).toBe(true)
    })

    it('should respond to health check', async () => {
      const response = await request(app).get('/health')
      expect(response.status).toBe(200)
    })

    it('should handle API documentation route', async () => {
      const response = await request(app).get('/api-docs')
      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    it('should handle unhandled rejection', async () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })
      
      process.emit('unhandledRejection', new Error('Test error'), Promise.resolve())
      
      // Verify error handling logic
      expect(mockExit).toHaveBeenCalledWith(1)
      mockExit.mockRestore()
    })

    it('should handle uncaught exception', () => {
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })
      
      process.emit('uncaughtException', new Error('Test error'))
      
      expect(mockExit).toHaveBeenCalledWith(1)
      mockExit.mockRestore()
    })

    it('should handle SIGTERM gracefully', () => {
      const mockClose = vi.spyOn(server, 'close')
      
      process.emit('SIGTERM')
      
      expect(mockClose).toHaveBeenCalled()
      mockClose.mockRestore()
    })
  })
})