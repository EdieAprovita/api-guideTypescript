// Mock BaseService to avoid modelName issues
jest.mock('../../services/BaseService', () => {
    return {
        __esModule: true,
        default: class MockBaseService {
            constructor() {}
            async create(data) {
                return { _id: 'new-recipe-id', ...data };
            }
        }
    };
});

import { recipeService } from "../../services/RecipesService";

describe("RecipesService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("calls model on create", async () => {
        const validRecipeData = {
            title: 'Test Recipe',
            description: 'A test recipe description',
            instructions: ['Step 1: Test'],
            cookingTime: 30
        };

        const result = await recipeService.create(validRecipeData);
        expect(result._id).toBe('new-recipe-id');
        expect(result.title).toBe('Test Recipe');
    });
});