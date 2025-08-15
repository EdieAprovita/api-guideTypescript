import { describe, it, expect, vi, beforeEach } from 'vitest'
import connectDB from '../../config/db'

// Mock mongoose completely
const mockConnect = vi.fn()
const mockOn = vi.fn()
const mockClose = vi.fn()

vi.mock('mongoose', () => ({
  default: {
    connect: mockConnect,
    connection: {
      on: mockOn,
      close: mockClose
    }
  }
}))

describe('Database Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DB
  })

  describe('Successful Connection', () => {
    it('should connect to MongoDB successfully', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      
      const mockConnection = {
        connection: {
          host: 'localhost',
          port: 27017,
          name: 'test'
        }
      }
      
      mockConnect.mockResolvedValue(mockConnection as never)
      
      await expect(connectDB()).resolves.not.toThrow()
      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        expect.objectContaining({
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          bufferCommands: false
        })
      )
    })

    it('should set up connection event handlers', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      vi.mocked(mockConnect).mockResolvedValue({
        connection: { host: 'localhost', port: 27017, name: 'test' }
      } as never)
      
      await connectDB()
      
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockOn).toHaveBeenCalledWith('disconnected', expect.any(Function))
    })
  })

  describe('Error Handling', () => {
    it('should throw error when DB environment variable is missing', async () => {
      await expect(connectDB()).rejects.toThrow('MongoDB URI is not defined')
    })

    it('should handle connection errors', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      
      const connectionError = new Error('Connection failed')
      vi.mocked(mockConnect).mockRejectedValue(connectionError)
      
      await expect(connectDB()).rejects.toThrow('Error connecting to the database')
    })
  })

  describe('Graceful Shutdown', () => {
    it('should close connection on SIGINT', async () => {
      process.env.DB = 'mongodb://localhost:27017/test'
      vi.mocked(mockConnect).mockResolvedValue({
        connection: { host: 'localhost', port: 27017, name: 'test' }
      } as never)
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called')
      })
      
      await connectDB()
      
      // Simulate SIGINT
      process.emit('SIGINT')
      
      expect(mockClose).toHaveBeenCalled()
      mockExit.mockRestore()
    })
  })
})