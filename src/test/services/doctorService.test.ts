import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

// Mock BaseService with shared utility
const mockData = [
    { "_id": "1", "doctorName": "Dr. Test 1" },
    { "_id": "2", "doctorName": "Dr. Test 2" }
];

jest.mock('../../services/BaseService', () => createBaseServiceMock(mockData));

import { doctorService } from "../../services/DoctorService";

describe("DoctorService", () => {
    const testUtils = setupServiceTest('DoctorService');

    it("delegates getAll to the model", async () => {
        const result = await testUtils.testGetAll(doctorService, 2);
        expect(result[0]).toMatchObject({
            "_id": "1",
            "doctorName": "Dr. Test 1"
        });
    });
});