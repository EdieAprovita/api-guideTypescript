// Doctors Controllers Test - Refactored to use centralized mocking system
import request from 'supertest';
import app from '../../app';
import { doctorService } from '../../services/DoctorService';
import { reviewService } from '../../services/ReviewService';
import { 
    expectSuccessResponse, 
    expectResourceCreated, 
    expectResourceUpdated, 
    expectResourceDeleted,
    createMockData 
} from '../utils/testHelpers';
import { MockDoctorService, MockReviewService } from '../types';

// Only mock the specific services used in this test
jest.mock('../../services/DoctorService');
jest.mock('../../services/ReviewService');

const mockDoctorService = doctorService as unknown as MockDoctorService;
const mockReviewService = reviewService as unknown as MockReviewService;

describe('Doctor Controllers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/v1/doctors', () => {
        it('should get all doctors', async () => {
            const mockDoctors = [
                createMockData.doctor({ doctorName: 'Dr. Smith' }),
                createMockData.doctor({ doctorName: 'Dr. Johnson' }),
            ];
            mockDoctorService.getAll.mockResolvedValue(mockDoctors);

            const response = await request(app).get('/api/v1/doctors');

            expectSuccessResponse(response);
            expect(mockDoctorService.getAll).toHaveBeenCalledTimes(1);
            expect(response.body.data).toEqual(mockDoctors);
        });

        it('should handle empty doctor list', async () => {
            mockDoctorService.getAll.mockResolvedValue([]);

            const response = await request(app).get('/api/v1/doctors');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual([]);
        });
    });

    describe('GET /api/v1/doctors/:id', () => {
        it('should get doctor by id', async () => {
            const doctorId = 'doctor-123';
            const mockDoctor = createMockData.doctor({ 
                _id: doctorId, 
                doctorName: 'Dr. Specific'
            });
            mockDoctorService.findById.mockResolvedValue(mockDoctor);

            const response = await request(app).get(`/api/v1/doctors/${doctorId}`);

            expectSuccessResponse(response);
            expect(mockDoctorService.findById).toHaveBeenCalledWith(doctorId);
            expect(response.body.data).toEqual(mockDoctor);
        });
    });

    describe('POST /api/v1/doctors', () => {
        it('should create a new doctor', async () => {
            const newDoctorData = {
                doctorName: 'Dr. New',
                location: { type: 'Point', coordinates: [40.7128, -74.0060] },
                address: 'New Doctor Address',
            };
            const createdDoctor = createMockData.doctor({ 
                ...newDoctorData, 
                _id: 'new-doctor-id' 
            });
            mockDoctorService.create.mockResolvedValue(createdDoctor);

            const response = await request(app)
                .post('/api/v1/doctors')
                .send(newDoctorData);

            expectResourceCreated(response);
            expect(mockDoctorService.create).toHaveBeenCalledWith(newDoctorData);
            expect(response.body.data).toEqual(createdDoctor);
        });
    });

    describe('PUT /api/v1/doctors/:id', () => {
        it('should update a doctor', async () => {
            const doctorId = 'doctor-123';
            const updateData = { 
                doctorName: 'Dr. Updated'
            };
            const updatedDoctor = createMockData.doctor({ 
                ...updateData, 
                _id: doctorId 
            });
            mockDoctorService.updateById.mockResolvedValue(updatedDoctor);

            const response = await request(app)
                .put(`/api/v1/doctors/${doctorId}`)
                .send(updateData);

            expectResourceUpdated(response);
            expect(mockDoctorService.updateById).toHaveBeenCalledWith(doctorId, updateData);
            expect(response.body.data).toEqual(updatedDoctor);
        });
    });

    describe('DELETE /api/v1/doctors/:id', () => {
        it('should delete a doctor', async () => {
            const doctorId = 'doctor-123';
            mockDoctorService.deleteById.mockResolvedValue(undefined);

            const response = await request(app).delete(`/api/v1/doctors/${doctorId}`);

            expectResourceDeleted(response);
            expect(mockDoctorService.deleteById).toHaveBeenCalledWith(doctorId);
        });
    });

    describe('Doctor with Reviews Integration', () => {
        it('should handle doctor with reviews', async () => {
            const doctorId = 'doctor-with-reviews';
            const mockDoctor = createMockData.doctor({ 
                _id: doctorId,
                doctorName: 'Dr. With Reviews'
            });
            const mockReviews = [
                { _id: 'review1', rating: 5, comment: 'Excellent doctor!' },
                { _id: 'review2', rating: 4, comment: 'Very professional!' }
            ];

            mockDoctorService.findById.mockResolvedValue(mockDoctor);
            mockReviewService.getTopRatedReviews.mockResolvedValue(mockReviews);

            const response = await request(app).get(`/api/v1/doctors/${doctorId}`);

            expectSuccessResponse(response);
            expect(mockDoctorService.findById).toHaveBeenCalledWith(doctorId);
            expect(response.body.data).toEqual(mockDoctor);
        });
    });

    describe('Geolocation Integration', () => {
        it('should handle doctors with location data', async () => {
            const mockDoctors = [
                createMockData.doctor({ 
                    doctorName: 'Location Doctor',
                    location: { type: 'Point', coordinates: [40.7128, -74.0060] }
                })
            ];
            mockDoctorService.getAll.mockResolvedValue(mockDoctors);

            const response = await request(app).get('/api/v1/doctors');

            expectSuccessResponse(response);
            expect(response.body.data).toEqual(mockDoctors);
        });
    });
});