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

describe('Restaurant API Integration Tests', () => {
    let adminId: string;
    let adminToken: string;

    beforeAll(async () => {
        await connectTestDB();
        const admin = await createAdminUser();
        adminId = admin._id.toString();
        const tokens = await generateAuthTokens(adminId, admin.email, admin.role);
        adminToken = tokens.accessToken;
    });

    afterEach(async () => {
        await clearTestDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    const generateRestaurantData = () => ({
        name: faker.company.name(),
        address: faker.location.streetAddress(),
        phoneNumber: faker.phone.number(),
        location: {
            type: 'Point' as const,
            coordinates: [
                parseFloat(faker.location.longitude()),
                parseFloat(faker.location.latitude()),
            ],
        },
        cuisine: ['Italian'],
        priceRange: '$$' as const,
    });

    it('should create a restaurant', async () => {
        const data = generateRestaurantData();

        const response = await request(app)
            .post('/api/v1/restaurants')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(data);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(data.name);

        const created = await Restaurant.findOne({ name: data.name });
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
});
