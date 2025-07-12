import request from 'supertest';
import { faker } from '@faker-js/faker';
import app from '../../app';
import {
    connect as connectTestDB,
    closeDatabase as disconnectTestDB,
    clearDatabase as clearTestDB,
} from './helpers/testDb';
import {
    createAdminUser,
    createTestRestaurant,
    generateAuthTokens,
} from './helpers/testFixtures';
import { Restaurant } from '../../models/Restaurant';

// Integration skipped pending environment setup
describe.skip('Restaurant API Integration Tests', () => {
    let adminId: string;
    let adminToken: string;

    beforeAll(async () => {
        await connectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        const admin = await createAdminUser();
        adminId = admin._id.toString();
        const tokens = await generateAuthTokens(adminId, admin.email, admin.role);
        adminToken = tokens.accessToken;
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    const generateRestaurantData = () => ({
        restaurantName: faker.company.name(),
        address: faker.location.streetAddress(),
        budget: '$$' as const,
        contact: [
            {
                phone: faker.phone.number(),
                facebook: faker.internet.url(),
                instagram: `@${faker.internet.userName()}`,
            },
        ],
        location: {
            type: 'Point' as const,
            coordinates: [
                faker.location.longitude(),
                faker.location.latitude(),
            ],
        },
        cuisine: ['Italian'],
        reviews: [],
        rating: 0,
        numReviews: 0,
        // Author is provided explicitly for test data consistency
        author: adminId,
    });

    it('should create a restaurant', async () => {
        const data = generateRestaurantData();

        const response = await request(app)
            .post('/api/v1/restaurants')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(data);


        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.restaurantName).toBe(data.restaurantName);

        const created = await Restaurant.findOne({ restaurantName: data.restaurantName });
        expect(created).not.toBeNull();
    });

    it('should get all restaurants', async () => {
        await createTestRestaurant(adminId);
        await createTestRestaurant(adminId);

        const response = await request(app).get('/api/v1/restaurants');


        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(2);
    });

    it('should get a restaurant by id', async () => {
        const restaurant = await createTestRestaurant(adminId);

        const response = await request(app).get(
            `/api/v1/restaurants/${restaurant._id}`
        );


        expect(response.status).toBe(200);
        expect(response.body.data._id.toString()).toBe(restaurant._id.toString());
    });

    it('should update a restaurant', async () => {
        const restaurant = await createTestRestaurant(adminId);

        const response = await request(app)
            .put(`/api/v1/restaurants/${restaurant._id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ restaurantName: 'Updated Name' });

        expect(response.status).toBe(200);
        expect(response.body.data.restaurantName).toBe('Updated Name');
    });

    it('should delete a restaurant', async () => {
        const restaurant = await createTestRestaurant(adminId);

        const response = await request(app)
            .delete(`/api/v1/restaurants/${restaurant._id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        const found = await Restaurant.findById(restaurant._id);
        expect(found).toBeNull();
    });

    it('should search restaurants by location', async () => {
        const restaurants = await createTestRestaurant(adminId);

        const [lng, lat] = restaurants.location.coordinates;

        const response = await request(app).get(
            `/api/v1/restaurants?latitude=${lat}&longitude=${lng}&radius=5000`
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
    });
});
