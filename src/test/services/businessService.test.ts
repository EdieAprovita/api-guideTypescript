/**
 * Simplified BusinessService Tests
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Business model
const mockBusiness = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    modelName: 'Business',
    exec: vi.fn(),
};

// Mock BaseService
vi.mock('../../services/BaseService', () => ({
    default: class MockBaseService {
        protected model: any;
        constructor(model: any) {
            this.model = model;
        }

        async getAll() {
            return this.model.find();
        }

        async findById(id: string) {
            return this.model.findById(id);
        }

        async create(data: any) {
            return this.model.create(data);
        }
    },
}));

// Mock Business model
vi.mock('../../models/Business', () => ({
    Business: mockBusiness,
}));

describe('BusinessService', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock returns
        mockBusiness.find.mockReturnValue([
            { _id: '1', namePlace: 'Test Business 1' },
            { _id: '2', namePlace: 'Test Business 2' },
        ]);

        mockBusiness.findById.mockImplementation((id: string) => ({
            _id: id,
            namePlace: `Test Business ${id}`,
        }));

        mockBusiness.create.mockImplementation((data: any) => ({
            _id: '3',
            ...data,
        }));
    });

    it('should get all businesses', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const result = await businessService.getAll();

        expect(result).toHaveLength(2);
        expect(result[0].namePlace).toBe('Test Business 1');
        expect(mockBusiness.find).toHaveBeenCalledTimes(1);
    });

    it('should find business by id', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const result = await businessService.findById('1');

        expect(result.namePlace).toBe('Test Business 1');
        expect(mockBusiness.findById).toHaveBeenCalledWith('1');
    });

    it('should create a business', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const newBusiness = { namePlace: 'New Business' };
        const result = await businessService.create(newBusiness);

        expect(result.namePlace).toBe('New Business');
        expect(mockBusiness.create).toHaveBeenCalledWith(newBusiness);
    });
});
