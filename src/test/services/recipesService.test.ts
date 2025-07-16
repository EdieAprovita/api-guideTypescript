import { createBaseServiceMock, setupServiceTest } from '../utils/testHelpers';

jest.mock('../../services/BaseService', () => createBaseServiceMock());

import { recipeService } from "../../services/RecipesService";

describe("RecipesService", () => {
    const testUtils = setupServiceTest('RecipesService');

    it("calls model on create", async () => {
        const validRecipeData = {
            title: 'Test Recipe',
            description: 'A test recipe description',
            instructions: ['Step 1: Test'],
            cookingTime: 30
        };

        const result = await testUtils.testCreate(recipeService, validRecipeData);
        expect(result.title).toBe('Test Recipe');
    });
});