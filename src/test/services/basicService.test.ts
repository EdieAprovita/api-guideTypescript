import { vi, describe, it, beforeEach, expect } from 'vitest';
import { Model } from 'mongoose';
import BaseService from '../../services/BaseService';
import { HttpError, HttpStatusCode } from '../../types/Errors';
import { IUser } from '../../models/User';

describe('BaseService', () => {
    let service: BaseService<IUser>;
    let model: Model<IUser>;

    beforeEach(() => {
        model = {
            find: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            findByIdAndUpdate: vi.fn(),
            deleteOne: vi.fn(),
            modelName: 'User'
        } as unknown as Model<IUser>;
        service = new BaseService<IUser>(model);
    });

    describe('getAll', () => {
        it('should return all items', async () => {
            const items = [{}, {}] as IUser[];
            model.find = vi.fn().mockResolvedValue(items);
            const result = await service.getAll();
            expect(result).toEqual(items);
        });
    });

    describe('findById', () => {
        it('should return an item by id', async () => {
            const item = {} as IUser;
            model.findById = vi.fn().mockResolvedValue(item);
            const result = await service.findById('1');
            expect(result).toEqual(item);
        });
    });

    it('should throw NotFoundError if item is not found', async () => {
        model.findById = vi.fn().mockResolvedValue(null);
        await expect(service.findById('1')).rejects.toThrow(
            new HttpError(HttpStatusCode.NOT_FOUND, 'Item not found')
        );
    });

    describe('create', () => {
        it('should create an item', async () => {
            const item = {} as IUser;
            model.create = vi.fn().mockResolvedValue(item);
            const result = await service.create(item);
            expect(result).toEqual(item);
        });
    });

    describe('updateById', () => {
        it('should update an item by id', async () => {
            const item = {} as IUser;
            model.findByIdAndUpdate = vi.fn().mockResolvedValue(item);
            const result = await service.updateById('1', item);
            expect(result).toEqual(item);
        });

        it('should throw NotFoundError if item is not found', async () => {
            model.findByIdAndUpdate = vi.fn().mockResolvedValue(null);
            await expect(service.updateById('1', {} as IUser)).rejects.toThrow(
                new HttpError(HttpStatusCode.NOT_FOUND, 'Item not found')
            );
        });
    });

    describe('deleteById', () => {
        it('should delete an item by id', async () => {
            model.findById = vi.fn().mockResolvedValue({} as IUser);
            await service.deleteById('1');
            expect(model.deleteOne).toHaveBeenCalled();
        });

        it('should throw NotFoundError if item is not found', async () => {
            model.findById = vi.fn().mockResolvedValue(null);
            await expect(service.deleteById('1')).rejects.toThrow(
                new HttpError(HttpStatusCode.NOT_FOUND, 'Item not found')
            );
        });
    });
});
