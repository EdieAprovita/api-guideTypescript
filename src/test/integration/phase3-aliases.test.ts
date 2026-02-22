import mongoose from 'mongoose';
import { Doctor } from '../../models/Doctor.js';
import { Market } from '../../models/Market.js';
import { Recipe } from '../../models/Recipe.js';
import { Sanctuary } from '../../models/Sanctuary.js';

describe('Phase 3: Entity Field Standardization - Aliases and Schema Extensions', () => {
    const authorId = new mongoose.Types.ObjectId();

    beforeAll(async () => {
        // Connect to a test DB if not connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-vegan-guide');
        }
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it('should allow accessing doctorName via "name" alias', async () => {
        const doctor = new Doctor({
            doctorName: 'Dr. Test Alias',
            author: authorId,
            address: '123 Test St',
            image: 'test.jpg',
            specialty: 'Nutrition',
            contact: [{ phone: '1234567890', email: 'dr@test.com' }],
        });

        expect(doctor.doctorName).toBe('Dr. Test Alias');
        expect((doctor as any).name).toBe('Dr. Test Alias');

        // Test setting via alias
        (doctor as any).name = 'Dr. Edited Alias';
        expect(doctor.doctorName).toBe('Dr. Edited Alias');
    });

    it('should allow accessing marketName and typeMarket via aliases', async () => {
        const market = new Market({
            marketName: 'Super Veggie',
            author: authorId,
            address: '456 Market St',
            image: 'market.jpg',
            typeMarket: 'supermarket',
        });

        expect(market.marketName).toBe('Super Veggie');
        expect((market as any).name).toBe('Super Veggie');
        expect((market as any).category).toBe('supermarket');

        (market as any).name = 'New Market Name';
        (market as any).category = 'grocery store';
        expect(market.marketName).toBe('New Market Name');
        expect(market.typeMarket).toBe('grocery store');
    });

    it('should allow accessing sanctuaryName and animal fields via aliases', async () => {
        const sanctuary = new Sanctuary({
            sanctuaryName: 'Happy Animals',
            author: authorId,
            image: 'sanctuary.jpg',
            typeofSanctuary: 'Farm',
            animals: [
                {
                    animalName: 'Bessie',
                    specie: 'Cow',
                    age: 5,
                    gender: 'Female',
                    habitat: 'Field',
                    diet: ['Grass'],
                    image: 'cow.jpg',
                    vaccines: ['None'],
                },
            ],
            capacity: 10,
            caretakers: ['John'],
            contact: [{ phone: '1112223333', email: 'happy@farm.com' }],
        });

        expect(sanctuary.sanctuaryName).toBe('Happy Animals');
        expect((sanctuary as any).name).toBe('Happy Animals');

        const animal = sanctuary.animals[0];
        expect(animal.animalName).toBe('Bessie');
        expect((animal as any).name).toBe('Bessie');
        expect((animal as any).species).toBe('Cow');
    });

    it('should correctly save and retrieve extended Recipe fields', async () => {
        const recipe = new Recipe({
            title: 'Tasty Vegan Salad',
            author: authorId,
            description: 'A very tasty salad',
            instructions: 'Mix everything',
            ingredients: ['Lettuce', 'Tomato'],
            image: 'salad.jpg',
            typeDish: 'Salad',
            difficulty: 'easy',
            servings: 2,
            cookingTime: 10,
            preparationTime: 5,
            budget: 'low',
        });

        expect(recipe.typeDish).toBe('Salad');
        expect(recipe.difficulty).toBe('easy');
        expect(recipe.servings).toBe(2);
        expect(recipe.preparationTime).toBe(5);
        expect(recipe.budget).toBe('low');
    });
});
