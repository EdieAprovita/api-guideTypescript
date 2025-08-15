import { vi, describe, it, expect } from 'vitest';
import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

const mockData = [
    { "_id": "1", "profileName": "Profile 1" },
    { "_id": "2", "profileName": "Profile 2" }
];

vi.mock('../../services/BaseService', () => createBaseServiceMock(mockData));

import { professionProfileService } from "../../services/ProfessionProfileService";

describe("ProfessionProfileService", () => {
    const testUtils = setupServiceTest('ProfessionProfileService');

    it("delegates getAll to the model", async () => {
        const result = await testUtils.testGetAll(professionProfileService, 2);
        expect(result[0]).toMatchObject({
            "_id": "1",
            "profileName": "Profile 1"
        });
    });
});