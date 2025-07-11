import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

// Mock BaseService with shared utility
const mockData = [
    { _id: '1', namePlace: 'Test Business 1' },
    { _id: '2', namePlace: 'Test Business 2' }
];

jest.mock('../../services/BaseService', () => createBaseServiceMock(mockData));

import { businessService } from "../../services/BusinessService";

describe("BusinessService", () => {
    const testUtils = setupServiceTest('BusinessService');

    it("delegates getAll to the model", async () => {
        const result = (await testUtils.testGetAll(
            businessService,
            2
        )) as Array<{ _id: string; namePlace: string }>;
        expect(result[0].namePlace).toBe('Test Business 1');
    });
});
