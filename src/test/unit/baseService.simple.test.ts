import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Document, Model } from 'mongoose';
import { Types } from 'mongoose';
import BaseService from '../../services/BaseService';
import { HttpError, HttpStatusCode } from '../../types/Errors';

interface TestDoc extends Document {
    _id: string;
    name: string;
}

describe('BaseService (simple)', () => {
    let items: TestDoc[];
    let fakeModel: Model<TestDoc> & { modelName: string };
    let service: BaseService<TestDoc>;

    beforeEach(() => {
        const id1 = new Types.ObjectId().toString();
        const id2 = new Types.ObjectId().toString();
        items = [{ _id: id1, name: 'A' } as TestDoc, { _id: id2, name: 'B' } as TestDoc];

        fakeModel = {
            modelName: 'Test',
            find: vi.fn().mockResolvedValue(items),
            findById: vi.fn().mockImplementation(async (id: string) => items.find(i => i._id === id) ?? null),
            create: vi.fn().mockImplementation(async (data: Partial<TestDoc>) => {
                const { _id, ...cleanData } = data as TestDoc;
                return { ...cleanData, _id: new Types.ObjectId().toString() };
            }),
            findByIdAndUpdate: vi.fn().mockImplementation(async (id: string, data: Partial<TestDoc>) => {
                const existing = items.find(i => i._id === id);
                if (!existing) return null;
                return { ...existing, ...data };
            }),
            deleteOne: vi.fn().mockResolvedValue({}),
        } as unknown as Model<TestDoc> & { modelName: string };

        service = new BaseService<TestDoc>(fakeModel);
    });

    it('getAll returns items', async () => {
        const result = await service.getAll();
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('A');
    });

    it('findById returns item', async () => {
        const doc = await service.findById(items[0]._id);
        expect(doc._id).toBe(items[0]._id);
    });

    it('findById throws NotFound when missing', async () => {
        const missingId = new Types.ObjectId().toString();
        await expect(service.findById(missingId)).rejects.toThrow(
            new HttpError(HttpStatusCode.NOT_FOUND, 'Item not found')
        );
    });

    it('create returns created item', async () => {
        const created = await service.create({ name: 'C' } as Partial<TestDoc>);
        expect(created._id).toBeDefined();
        expect(created.name).toBe('C');
    });

    it('updateById updates when exists', async () => {
        const updated = await service.updateById(items[0]._id, { name: 'AA' } as Partial<TestDoc>);
        expect(updated.name).toBe('AA');
    });

    it('updateById throws NotFound when missing', async () => {
        const missingId = new Types.ObjectId().toString();
        await expect(service.updateById(missingId, { name: 'Z' } as Partial<TestDoc>)).rejects.toThrow(
            new HttpError(HttpStatusCode.NOT_FOUND, 'Item not found')
        );
    });

    it('deleteById removes when exists, throws when missing', async () => {
        const missingId = new Types.ObjectId().toString();
        await expect(service.deleteById(missingId)).rejects.toThrow(
            new HttpError(HttpStatusCode.NOT_FOUND, 'Item not found')
        );
    });
});
