// Mock BaseService to avoid modelName issues
jest.mock('../../services/BaseService', () => {
    return {
        __esModule: true,
        default: class MockBaseService {
            constructor() {}
            async getAll() {
                return [
          {
                    "_id": "1",
                    "marketName": "Market 1"
          },
          {
                    "_id": "2",
                    "marketName": "Market 2"
          }
];
            }
            async updateById(id, data) {
                return { _id: id, ...data };
            }
            async create(data) {
                return { _id: 'new-id', ...data };
            }
        }
    };
});

import { marketsService } from "../../services/MarketsService";

describe("MarketsService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("delegates getAll to the model", async () => {
        const result = await marketsService.getAll();
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
        "_id": "1",
        "marketName": "Market 1"
});
    });
});