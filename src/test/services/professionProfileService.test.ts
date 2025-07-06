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
                    "profileName": "Profile 1"
          },
          {
                    "_id": "2",
                    "profileName": "Profile 2"
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

import { professionProfileService } from "../../services/ProfessionProfileService";

describe("ProfessionProfileService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("delegates getAll to the model", async () => {
        const result = await professionProfileService.getAll();
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
        "_id": "1",
        "profileName": "Profile 1"
});
    });
});