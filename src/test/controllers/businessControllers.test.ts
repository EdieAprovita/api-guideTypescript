// Business Controllers Test - Refactored to eliminate duplication
import request from 'supertest';
import { setupCommonMocks, resetMocks, createMockBusiness } from '../utils/testHelpers';
import testConfig from '../testConfig';

// === CRITICAL: Mocks must be defined BEFORE any imports ===
setupCommonMocks();

// Mock services with proper structure - including cache methods
jest.mock('../../services/BusinessService', () => ({
    businessService: {
        getAll: jest.fn(),
        getAllCached: jest.fn(),
        findById: jest.fn(),
        findByIdCached: jest.fn(),
        create: jest.fn(),
        createCached: jest.fn(),
        updateById: jest.fn(),
        updateByIdCached: jest.fn(),
        deleteById: jest.fn(),
    },
}));

jest.mock('../../services/GeoService', () => ({
    __esModule: true,
    default: {
        geocodeAddress: jest.fn(),
    },
}));

jest.mock('../../services/ReviewService', () => ({
    reviewService: {
        addReview: jest.fn(),
    },
}));

// Now import the app after all mocks are set up
import app from '../../app';
import { businessService } from '../../services/BusinessService';
import geoService from '../../services/GeoService';
import { reviewService } from '../../services/ReviewService';

beforeEach(() => {
    resetMocks();
});

describe('Business Controllers Tests', () => {
    describe('Get all businesses', () => {
        it('should get all businesses', async () => {
            const mockBusinesses = [createMockBusiness()];

            (businessService.getAllCached as jest.Mock).mockResolvedValueOnce(mockBusinesses);

            const response = await request(app).get('/api/v1/businesses');

            expect(response.status).toBe(200);
            expect(businessService.getAllCached).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: 'Businesses fetched successfully',
                data: mockBusinesses,
            });
        }, 10000);
    });

    describe('Get business by id', () => {
        it('should get business by id', async () => {
            const mockBusiness = createMockBusiness();

            (businessService.findByIdCached as jest.Mock).mockResolvedValueOnce(mockBusiness);

            const response = await request(app).get(`/api/v1/businesses/${mockBusiness._id}`);

            expect(response.status).toBe(200);
            expect(businessService.findByIdCached).toHaveBeenCalledWith(mockBusiness._id);
            expect(response.body).toEqual({
                success: true,
                message: 'Business fetched successfully',
                data: mockBusiness,
            });
        });
    });

    describe('Create business', () => {
        it('sets location when geocoding succeeds', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
            (businessService.create as jest.Mock).mockResolvedValue({ id: '1' });

            const businessData = {
                name: 'My Shop',
                description: 'A great shop',
                address: '123 st',
                typeBusiness: 'retail',
                phone: testConfig.generateTestPhone(),
            };

            const response = await request(app).post('/api/v1/businesses').send(businessData);

            expect(response.status).toBe(201);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('123 st');
            expect(businessService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...businessData,
                    location: { type: 'Point', coordinates: [2, 1] },
                })
            );
        });

        it('leaves location unset when geocoding fails', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue(null);
            (businessService.create as jest.Mock).mockResolvedValue({ id: '1' });

            const businessData = {
                name: 'Shop',
                description: 'Another shop',
                address: 'bad',
                typeBusiness: 'retail',
                phone: testConfig.generateTestPhone(),
            };

            const response = await request(app).post('/api/v1/businesses').send(businessData);

            expect(response.status).toBe(201);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('bad');
            expect(businessService.create).toHaveBeenCalledWith(expect.objectContaining(businessData));
        });

        it('handles geocoding errors gracefully', async () => {
            (geoService.geocodeAddress as jest.Mock).mockRejectedValue(new Error('Geocoding failed'));
            (businessService.create as jest.Mock).mockResolvedValue({ id: '1' });

            const businessData = {
                name: 'BoomCo',
                description: 'A company',
                address: 'explode',
                typeBusiness: 'retail',
                phone: testConfig.generateTestPhone(),
            };

            const response = await request(app).post('/api/v1/businesses').send(businessData);

            expect(response.status).toBe(201);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('explode');
            expect(businessService.create).toHaveBeenCalledWith(expect.objectContaining(businessData));
        });
    });

    describe('Update business', () => {
        it('geocodes updated address', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 2, lng: 3 });
            (businessService.updateById as jest.Mock).mockResolvedValue({ id: '1' });

            const businessData = {
                name: 'Updated Shop',
                description: 'Updated description',
                address: '456 road',
                typeBusiness: 'retail',
                phone: testConfig.generateTestPhone(),
            };

            const response = await request(app).put('/api/v1/businesses/1').send(businessData);

            expect(response.status).toBe(200);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('456 road');
            expect(businessService.updateById).toHaveBeenCalledWith(
                '1',
                expect.objectContaining({
                    ...businessData,
                    location: { type: 'Point', coordinates: [3, 2] },
                })
            );
        });

        it('does not set location when geocoding returns null', async () => {
            (geoService.geocodeAddress as jest.Mock).mockResolvedValue(null);
            (businessService.updateById as jest.Mock).mockResolvedValue({ id: '1' });

            const businessData = {
                name: 'Shop',
                description: 'Description',
                address: 'no',
                typeBusiness: 'retail',
                phone: testConfig.generateTestPhone(),
            };

            const response = await request(app).put('/api/v1/businesses/1').send(businessData);

            expect(response.status).toBe(200);
            expect(geoService.geocodeAddress).toHaveBeenCalledWith('no');
            expect(businessService.updateById).toHaveBeenCalledWith('1', expect.objectContaining(businessData));
        });
    });

    describe('Add review to business', () => {
        it('should add review to business', async () => {
            const mockReview = {
                _id: 'reviewId',
                businessId: 'businessId',
                rating: 5,
                comment: 'Great business!',
            };

            (reviewService.addReview as jest.Mock).mockResolvedValueOnce(mockReview);

            const reviewData = {
                rating: 5,
                comment: 'Great business!',
            };

            const response = await request(app).post('/api/v1/businesses/add-review/businessId').send(reviewData);

            expect(response.status).toBe(200);
            expect(reviewService.addReview).toHaveBeenCalledWith({
                ...reviewData,
                businessId: 'businessId',
            });
            expect(response.body).toEqual({
                success: true,
                message: 'Review added successfully',
                data: mockReview,
            });
        });
    });

    describe('Delete business', () => {
        it('should delete business', async () => {
            (businessService.deleteById as jest.Mock).mockResolvedValueOnce(undefined);

            const response = await request(app).delete('/api/v1/businesses/businessId');

            expect(response.status).toBe(200);
            expect(businessService.deleteById).toHaveBeenCalledWith('businessId');
            expect(response.body).toEqual({
                success: true,
                message: 'Business deleted successfully',
            });
        });
    });
});
