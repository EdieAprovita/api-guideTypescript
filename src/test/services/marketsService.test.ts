import { vi, describe, it, expect } from 'vitest';
import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

const mockData = [
    { "_id": "1", "marketName": "Market 1" },
    { "_id": "2", "marketName": "Market 2" }
];

vi.mock('../../services/BaseService', () => createBaseServiceMock(mockData));

import { marketsService } from "../../services/MarketsService";

describe("MarketsService", () => {
    const testUtils = setupServiceTest('MarketsService');

    it("delegates getAll to the model", async () => {
        const result = await testUtils.testGetAll(marketsService, 2);
        expect(result[0]).toMatchObject({
            "_id": "1",
            "marketName": "Market 1"
        });
    });
});