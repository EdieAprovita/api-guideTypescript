/**
 * BusinessService Tests - Using Simple Mocks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetAllMocks } from '../__mocks__/simple-mocks';

// Create simple mocks directly
const mockBusinessData = [
    { _id: '1', namePlace: 'Test Business 1', author: 'user1' },
    { _id: '2', namePlace: 'Test Business 2', author: 'user2' },
];

// Mock BaseService
vi.mock('../../services/BaseService', () => ({
    default: class MockBaseService {
        protected model: unknown;

        constructor(model: unknown) {
            this.model = model;
        }

        async getAll() {
            return mockBusinessData;
        }

        async findById(id: string) {
            return { _id: id, namePlace: `Business ${id}`, author: 'mock-user-id' };
        }

        async create(data: Record<string, unknown>) {
            return { _id: 'new-business-id', ...data };
        }

        async updateById(id: string, data: Record<string, unknown>) {
            return { _id: id, ...data };
        }

        async deleteById(id: string) {
            return undefined;
        }
    },
}));

// Mock Business model
vi.mock('../../models/Business', () => ({
    Business: {
        modelName: 'Business',
    },
}));

describe('BusinessService - Simple Tests', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    it('should get all businesses', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const result = await businessService.getAll();

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('namePlace', 'Test Business 1');
    });

    it('should find business by id', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const result = await businessService.findById('test-id');

        expect(result).toHaveProperty('_id', 'test-id');
        expect(result).toHaveProperty('namePlace', 'Business test-id');
    });

    it('should create a business', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const newBusiness = { namePlace: 'New Business' };
        const result = await businessService.create(newBusiness);

        expect(result).toHaveProperty('_id', 'new-business-id');
        expect(result).toHaveProperty('namePlace', 'New Business');
    });

    it('should update a business', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const updateData = { namePlace: 'Updated Business' };
        const result = await businessService.updateById('test-id', updateData);

        expect(result).toHaveProperty('namePlace', 'Updated Business');
    });

    it('should delete a business', async () => {
        const { businessService } = await import('../../services/BusinessService');
        await expect(businessService.deleteById('test-id')).resolves.toBeUndefined();
    });
});
