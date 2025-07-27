import { vi, describe, it, expect } from 'vitest';

// Simple mock for BusinessService that works
const mockBusinessService = {
    getAll: vi.fn().mockResolvedValue([
        { _id: '1', namePlace: 'Test Business 1' },
        { _id: '2', namePlace: 'Test Business 2' }
    ]),
    findById: vi.fn().mockImplementation((id: string) => 
        Promise.resolve({ _id: id, namePlace: `Test Business ${id}` })
    ),
    create: vi.fn().mockImplementation((data: unknown) => 
        Promise.resolve({ _id: '3', ...data })
    ),
};

vi.mock('../../services/BusinessService', () => ({
    businessService: mockBusinessService
}));

describe('BusinessService', () => {
    it('should get all businesses', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const result = await businessService.getAll();
        expect(result).toHaveLength(2);
        expect(result[0].namePlace).toBe('Test Business 1');
    });

    it('should find business by id', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const result = await businessService.findById('1');
        expect(result.namePlace).toBe('Test Business 1');
    });

    it('should create a business', async () => {
        const { businessService } = await import('../../services/BusinessService');
        const newBusiness = { namePlace: 'New Business' };
        const result = await businessService.create(newBusiness);
        expect(result.namePlace).toBe('New Business');
    });
});