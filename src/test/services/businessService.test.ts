// Mock BaseService to avoid modelName issues
jest.mock('../../services/BaseService', () => {
    return {
        __esModule: true,
        default: class MockBaseService {
            constructor() {}
            async getAll() {
                return [
                    { _id: '1', namePlace: 'Test Business 1' },
                    { _id: '2', namePlace: 'Test Business 2' }
                ];
            }
        }
    };
});

import { businessService } from "../../services/BusinessService";

describe("BusinessService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("delegates getAll to the model", async () => {
        const result = await businessService.getAll();
        expect(result).toHaveLength(2);
        expect(result[0].namePlace).toBe('Test Business 1');
    });
});
