import { vi, Mock } from 'vitest';
import { faker } from '@faker-js/faker';
import request from 'supertest';
import { setupCommonMocks, resetMocks, createMockRecipe } from '../utils/testHelpers';

// === CRITICAL: Mocks must be defined BEFORE any imports ===
setupCommonMocks();

// Mock services with proper structure
vi.mock('../../services/RecipesService', () => ({
    recipeService: {
        getAll: vi.fn(),
        findById: vi.fn(),
        create: vi.fn(),
        updateById: vi.fn(),
        deleteById: vi.fn(),
    },
}));

// Now import the app after all mocks are set up
import app from '../../app';
import { recipeService } from '../../services/RecipesService';

beforeEach(() => {
    resetMocks();
});

describe('Recipes Controllers', () => {
    describe('Get all recipes', () => {
        it('should get all recipes', async () => {
            const mockRecipes = [createMockRecipe(), createMockRecipe()];

            (recipeService.getAll as Mock).mockResolvedValueOnce(mockRecipes);

            const response = await request(app).get('/api/v1/recipes');

            expect(response.status).toBe(200);
            expect(recipeService.getAll).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                data: mockRecipes,
            });
        });
    });

    describe('Get recipe by id', () => {
        it('should get recipe by id', async () => {
            const mockRecipe = createMockRecipe();

            (recipeService.findById as Mock).mockResolvedValueOnce(mockRecipe);

            const response = await request(app).get(`/api/v1/recipes/${mockRecipe._id}`);

            expect(response.status).toBe(200);
            expect(recipeService.findById).toHaveBeenCalledWith(mockRecipe._id);
            expect(response.body).toEqual({
                success: true,
                message: 'Recipe fetched successfully',
                data: mockRecipe,
            });
        });
    });

    describe('Create recipe', () => {
        it('should create a new recipe', async () => {
            const recipeData = {
                title: 'Test Recipe',
                ingredients: ['ingredient1', 'ingredient2'],
                instructions: ['step1', 'step2'],
                author: faker.database.mongodbObjectId(),
                cookingTime: 30,
                difficulty: 'medium',
            };

            const createdRecipe = { ...recipeData, _id: 'recipe123' };
            (recipeService.create as Mock).mockResolvedValueOnce(createdRecipe);

            const response = await request(app).post('/api/v1/recipes').send(recipeData);

            expect(response.status).toBe(201);
            expect(recipeService.create).toHaveBeenCalledWith(recipeData);
            expect(response.body).toEqual({
                success: true,
                data: createdRecipe,
            });
        });
    });

    describe('Update recipe', () => {
        it('should update recipe by id', async () => {
            const recipeId = 'recipe123';
            const updateData = {
                title: 'Updated Recipe',
                cookingTime: 45,
            };

            const updatedRecipe = { ...updateData, _id: recipeId };
            (recipeService.updateById as Mock).mockResolvedValueOnce(updatedRecipe);

            const response = await request(app).put(`/api/v1/recipes/${recipeId}`).send(updateData);

            expect(response.status).toBe(200);
            expect(recipeService.updateById).toHaveBeenCalledWith(recipeId, updateData);
            expect(response.body).toEqual({
                success: true,
                data: updatedRecipe,
            });
        });
    });

    describe('Delete recipe', () => {
        it('should delete recipe by id', async () => {
            const recipeId = 'recipe123';

            (recipeService.deleteById as Mock).mockResolvedValueOnce(undefined);

            const response = await request(app).delete(`/api/v1/recipes/${recipeId}`);

            expect(response.status).toBe(204);
            expect(recipeService.deleteById).toHaveBeenCalledWith(recipeId);
            expect(response.body).toEqual({});
        });
    });
});
