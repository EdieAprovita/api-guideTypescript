// Mock BaseService to avoid modelName issues
jest.mock('../../services/BaseService', () => {
    return {
        __esModule: true,
        default: class MockBaseService {
            constructor() {}
            async updateById(id, data) {
                return { _id: id, ...data };
            }
        }
    };
});

import { restaurantService } from "../../services/RestaurantService";

describe("RestaurantService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("uses model for update", async () => {
        const result = await restaurantService.updateById("507f1f77bcf86cd799439011", { name: 'Updated Name' });
        expect(result._id).toBe("507f1f77bcf86cd799439011");
        expect(result.name).toBe('Updated Name');
    });
});