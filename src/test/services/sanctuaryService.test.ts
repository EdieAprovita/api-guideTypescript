import { vi } from 'vitest';
import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

// Mock BaseService with shared utility - define mockData inline to avoid hoisting issues
vi.mock('../../services/BaseService', () => {
    const mockData = [
        { _id: '1', sanctuaryName: 'Sanctuary 1' },
        { _id: '2', sanctuaryName: 'Sanctuary 2' },
    ];
    return createBaseServiceMock(mockData);
});

import { sanctuaryService } from '../../services/SanctuaryService';

describe('SanctuaryService', () => {
    const testUtils = setupServiceTest('SanctuaryService');

    it('delegates getAll to the model', async () => {
        const result = await testUtils.testGetAll(sanctuaryService, 2);
        expect(result[0]).toMatchObject({
            _id: '1',
            sanctuaryName: 'Sanctuary 1',
        });
    });
});
