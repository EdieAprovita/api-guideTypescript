import request from 'supertest';
import { faker } from '@faker-js/faker';
import app from '../../app';
import { createTestBusiness } from './helpers/testFixtures';
import { Business } from '../../models/Business';
import { setupTestDB, refreshAdmin, AdminAuth } from './helpers/testSetup';

// Integration tests for Business endpoints (skipped pending environment setup)
describe.skip('Business API Integration Tests', () => {
    setupTestDB();
    let admin: AdminAuth;

    beforeEach(async () => {
        admin = await refreshAdmin();
    });

    const generateBusinessData = () => ({
        namePlace: faker.company.name(),
        address: faker.location.streetAddress(),
        contact: [
            {
                phone: faker.phone.number().toString(),
                email: faker.internet.email(),
            },
        ],
        budget: 5,
        typeBusiness: 'store',
        hours: [
            { dayOfWeek: 'Monday', openTime: '09:00', closeTime: '18:00' },
        ],
        location: {
            type: 'Point' as const,
            coordinates: [faker.location.longitude(), faker.location.latitude()],
        },
        author: admin.adminId,
    });

    it('should create a business', async () => {
        const data = generateBusinessData();

        const response = await request(app)
            .post('/api/v1/businesses')
            .set('Authorization', `Bearer ${admin.adminToken}`)
            .send(data);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.namePlace).toBe(data.namePlace);

        const created = await Business.findOne({ namePlace: data.namePlace });
        expect(created).not.toBeNull();
    });

    it('should get all businesses', async () => {
        await createTestBusiness(admin.adminId);
        await createTestBusiness(admin.adminId);

        const response = await request(app).get('/api/v1/businesses');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(2);
    });

    it('should get a business by id', async () => {
        const business = await createTestBusiness(admin.adminId);

        const response = await request(app).get(
            `/api/v1/businesses/${business._id}`
        );

        expect(response.status).toBe(200);
        expect(response.body.data._id.toString()).toBe(business._id.toString());
    });

    it('should update a business', async () => {
        const business = await createTestBusiness(admin.adminId);

        const response = await request(app)
            .put(`/api/v1/businesses/${business._id}`)
            .set('Authorization', `Bearer ${admin.adminToken}`)
            .send({ namePlace: 'Updated Business' });

        expect(response.status).toBe(200);
        expect(response.body.data.namePlace).toBe('Updated Business');
    });

    it('should delete a business', async () => {
        const business = await createTestBusiness(admin.adminId);

        const response = await request(app)
            .delete(`/api/v1/businesses/${business._id}`)
            .set('Authorization', `Bearer ${admin.adminToken}`);

        expect(response.status).toBe(200);
        const found = await Business.findById(business._id);
        expect(found).toBeNull();
    });
});