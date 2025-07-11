import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';
import { MockBusiness } from '../types';

// Mock BaseService with shared utility
const mockData = [
    { _id: '1', name: 'Test Business 1' },
    { _id: '2', name: 'Test Business 2' }
];

jest.mock('../../services/BaseService', () => createBaseServiceMock(mockData));

import { businessService } from "../../services/BusinessService";

describe("BusinessService", () => {
    const testUtils = setupServiceTest('BusinessService');

    it("delegates getAll to the model", async () => {
        const result = (await testUtils.testGetAll(
            businessService,
            2
        )) as Array<MockBusiness>;
        expect(result[0].name).toBe('Test Business 1');
    });
});
