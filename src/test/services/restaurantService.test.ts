import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

jest.mock('../../services/BaseService', () => createBaseServiceMock());

import { restaurantService } from "../../services/RestaurantService";

describe("RestaurantService", () => {
    const testUtils = setupServiceTest('RestaurantService');

    it("uses model for update", async () => {
        const result = await testUtils.testUpdate(restaurantService, "507f1f77bcf86cd799439011", { name: 'Updated Name' });
        expect(result.name).toBe('Updated Name');
    });
});