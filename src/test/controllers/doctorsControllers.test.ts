// Prevent database connection attempts when importing the app
jest.mock('../../config/db');
jest.mock('../../middleware/authMiddleware', () => ({
    protect: (_req, _res, next) => next(),
    admin: (_req, _res, next) => next(),
    professional: (_req, _res, next) => next(),
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
}));
jest.mock('../../middleware/validation', () => ({
    sanitizeInput: () => [(_req, _res, next) => next()],
    securityHeaders: (_req, _res, next) => next(),
    validateInputLength: () => (_req, _res, next) => next(),
    validate: () => (_req, _res, next) => next(),
    rateLimits: {
        api: (_req, _res, next) => next(),
        auth: (_req, _res, next) => next(),
        register: (_req, _res, next) => next(),
        search: (_req, _res, next) => next(),
    },
}));
jest.mock('../../middleware/security', () => ({
    securityHeaders: (_req, _res, next) => next(),
    enforceHTTPS: (_req, _res, next) => next(),
    configureHelmet: () => (_req, _res, next) => next(),
    addCorrelationId: (_req, _res, next) => next(),
    requireAPIVersion: () => (_req, _res, next) => next(),
    validateUserAgent: (_req, _res, next) => next(),
    limitRequestSize: () => (_req, _res, next) => next(),
    detectSuspiciousActivity: (_req, _res, next) => next(),
}));

import request from 'supertest';
import { geoService } from './controllerTestSetup';
import type { Request, Response, NextFunction } from 'express';
import app from '../../app';
import { doctorService } from '../../services/DoctorService';
import { reviewService } from '../../services/ReviewService';

jest.mock('../../services/DoctorService', () => ({
    doctorService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
    },
}));

// Mock controllers de auth que se usan en authRoutes
jest.mock('../../controllers/userControllers', () => ({
    refreshToken: (_req, res) => res.status(200).json({ success: true }),
    logout: (_req, res) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req, res) => res.status(200).json({ success: true }),
    registerUser: (_req, res) => res.status(201).json({ success: true }),
    loginUser: (_req, res) => res.status(200).json({ success: true }),
    forgotPassword: (_req, res) => res.status(200).json({ success: true }),
    resetPassword: (_req, res) => res.status(200).json({ success: true }),
    getUsers: (_req, res) => res.status(200).json({ success: true }),
    getUserById: (_req, res) => res.status(200).json({ success: true }),
    updateUserProfile: (_req, res) => res.status(200).json({ success: true }),
    getCurrentUserProfile: (_req, res) => res.status(200).json({ success: true }),
    deleteUserById: (_req, res) => res.status(200).json({ success: true }),
}));

describe('Doctors Controllers', () => {
    it('gets doctors', async () => {
        (doctorService.getAll as jest.Mock).mockResolvedValue([]);
        const res = await request(app).get('/api/v1/doctors');
        expect(res.status).toBe(200);
        expect(doctorService.getAll).toHaveBeenCalled();
    });

    it('deletes a doctor', async () => {
        (doctorService.deleteById as jest.Mock).mockResolvedValue(undefined);
        const res = await request(app).delete('/api/v1/doctors/delete/1');
        expect(res.status).toBe(200);
        expect(doctorService.deleteById).toHaveBeenCalledWith('1');
    });

    it('creates a doctor', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 1, lng: 2 });
        (doctorService.create as jest.Mock).mockResolvedValue({ id: '1' });

        await request(app).post('/api/v1/doctors/create').send({ address: 'a' });

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('a');
        expect(doctorService.create).toHaveBeenCalledWith(
            expect.objectContaining({ address: 'a', location: { type: 'Point', coordinates: [2, 1] } })
        );
    });

    it('updates a doctor', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 3, lng: 4 });
        (doctorService.updateById as jest.Mock).mockResolvedValue({ id: '1' });

        await request(app).put('/api/v1/doctors/update/1').send({ address: 'b' });

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('b');
        expect(doctorService.updateById).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({ address: 'b', location: { type: 'Point', coordinates: [4, 3] } })
        );
    });

    it('adds a review', async () => {
        (reviewService.addReview as jest.Mock).mockResolvedValue({ id: 'r' });

        const res = await request(app).post('/api/v1/doctors/add-review/1').send({ text: 'good' });

        expect(res.status).toBe(200);
        expect(reviewService.addReview).toHaveBeenCalledWith({ text: 'good', doctorId: '1' });
    });
});
