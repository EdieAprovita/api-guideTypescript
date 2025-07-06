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
                    "professionName": "Profession 1"
          },
          {
                    "_id": "2",
                    "professionName": "Profession 2"
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

import { professionService } from "../../services/ProfessionService";

describe("ProfessionService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("delegates getAll to the model", async () => {
        const result = await professionService.getAll();
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
        "_id": "1",
        "professionName": "Profession 1"
});
    });
});