import { vi, describe, it, expect } from 'vitest';
import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

const mockData = [
    { "_id": "1", "professionName": "Profession 1" },
    { "_id": "2", "professionName": "Profession 2" }
];

vi.mock('../../services/BaseService', () => createBaseServiceMock(mockData));

import { professionService } from "../../services/ProfessionService";

describe("ProfessionService", () => {
    const testUtils = setupServiceTest('ProfessionService');

    it("delegates getAll to the model", async () => {
        const result = await testUtils.testGetAll(professionService, 2);
        expect(result[0]).toMatchObject({
            "_id": "1",
            "professionName": "Profession 1"
        });
    });
});