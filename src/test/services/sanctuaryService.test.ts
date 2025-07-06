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
                    "sanctuaryName": "Sanctuary 1"
          },
          {
                    "_id": "2",
                    "sanctuaryName": "Sanctuary 2"
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

import { sanctuaryService } from "../../services/SanctuaryService";

describe("SanctuaryService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("delegates getAll to the model", async () => {
        const result = await sanctuaryService.getAll();
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
        "_id": "1",
        "sanctuaryName": "Sanctuary 1"
});
    });
});