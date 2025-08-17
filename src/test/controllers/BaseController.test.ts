import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import { BaseController } from '@/controllers/BaseController'
import type BaseService from '@/services/BaseService'
import type { Document } from 'mongoose'
import { testUtils } from '@test/helpers/testBase'
import { validationResult } from 'express-validator'
import { HttpStatusCode } from '@/types/Errors'

vi.mock('express-validator', () => ({
  validationResult: vi.fn()
}))

describe('BaseController', () => {
  let controller: BaseController<Document>
  let service: {
    getAll: ReturnType<typeof vi.fn>
    findById: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    updateById: ReturnType<typeof vi.fn>
    deleteById: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    service = {
      getAll: vi.fn().mockResolvedValue([{ id: '1' }]),
      findById: vi.fn().mockResolvedValue({ id: '1' }),
      create: vi.fn().mockResolvedValue({ id: '1' }),
      updateById: vi.fn().mockResolvedValue({ id: '1' }),
      deleteById: vi.fn().mockResolvedValue(undefined)
    }
    controller = new BaseController<Document>(service as unknown as BaseService<Document>)
    vi.mocked(validationResult).mockReset()
  })

  it('getAll should respond with resources', async () => {
    const req = testUtils.createMockRequest() as Request
    const res = testUtils.createMockResponse() as Response
    const next = testUtils.createMockNext()

    await controller.getAll(req, res, next)

    expect(service.getAll).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK)
    expect(next).not.toHaveBeenCalled()
  })

  it('getAll should forward errors', async () => {
    service.getAll.mockRejectedValueOnce(new Error('fail'))
    const req = testUtils.createMockRequest() as Request
    const res = testUtils.createMockResponse() as Response
    const next = testUtils.createMockNext()

    await controller.getAll(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('getById should fetch resource', async () => {
    const req = testUtils.createMockRequest({ params: { id: '1' } }) as Request
    const res = testUtils.createMockResponse() as Response
    const next = testUtils.createMockNext()

    await controller.getById(req, res, next)

    expect(service.findById).toHaveBeenCalledWith('1')
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK)
    expect(next).not.toHaveBeenCalled()
  })

  it('create should return created resource', async () => {
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => true,
      array: () => []
    })
    const req = testUtils.createMockRequest({ body: { name: 'test' } }) as Request
    const res = testUtils.createMockResponse() as Response
    vi.mocked(validationResult).mockReturnValue(mockValidationResultSuccess)

    await controller.create(req, res, next)

    expect(service.create).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.CREATED)
    expect(next).not.toHaveBeenCalled()
  })

  it('create should handle validation errors', async () => {
    vi.mocked(validationResult).mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'Invalid' }]
    })
    const req = testUtils.createMockRequest({ body: {} }) as Request
    const res = testUtils.createMockResponse() as Response
    const next = testUtils.createMockNext()

    await controller.create(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(service.create).not.toHaveBeenCalled()
  })

  it('delete should remove resource', async () => {
    const req = testUtils.createMockRequest({ params: { id: '1' } }) as Request
    const res = testUtils.createMockResponse() as Response
    const next = testUtils.createMockNext()

    await controller.delete(req, res, next)

    expect(service.deleteById).toHaveBeenCalledWith('1')
    expect(res.status).toHaveBeenCalledWith(HttpStatusCode.OK)
    expect(next).not.toHaveBeenCalled()
  })
})
