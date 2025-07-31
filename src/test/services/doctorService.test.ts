import { vi } from 'vitest';
import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

// Mock BaseService with shared utility - define mockData inline to avoid hoisting issues
vi.mock('../../services/BaseService', () => {
    const mockData = [
        { _id: '1', doctorName: 'Dr. Test 1' },
        { _id: '2', doctorName: 'Dr. Test 2' },
    ];
    return createBaseServiceMock(mockData);
});

import { doctorService } from '../../services/DoctorService';

describe('DoctorService', () => {
    const testUtils = setupServiceTest('DoctorService');

    it('delegates getAll to the model', async () => {
        const result = await testUtils.testGetAll(doctorService, 2);
        expect(result[0]).toMatchObject({
            _id: '1',
            doctorName: 'Dr. Test 1',
        });
    });
});
