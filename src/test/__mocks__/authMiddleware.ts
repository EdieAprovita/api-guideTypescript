import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { Request, Response, NextFunction } from 'express';
import testConfig from '../testConfig';

export const protect = vi.fn((req: Request, res: Response, next: NextFunction) => {
    const reqWithUser = req as Request & { user?: { _id: string; role: string; email: string } };
    reqWithUser.user = {
        _id: faker.database.mongodbObjectId(),
        role: 'user',
        email: faker.internet.email(),
    };
    next();
});

export const admin = vi.fn((req: Request, res: Response, next: NextFunction) => {
    const reqWithUser = req as Request & { user?: { _id: string; role: string; email: string } };
    reqWithUser.user = {
        _id: faker.database.mongodbObjectId(),
        role: 'admin',
        email: faker.internet.email(),
    };
    next();
});

export const professional = vi.fn((req: Request, res: Response, next: NextFunction) => {
    const reqWithUser = req as Request & { user?: { _id: string; role: string; email: string } };
    reqWithUser.user = {
        _id: faker.database.mongodbObjectId(),
        role: 'professional',
        email: faker.internet.email(),
    };
    next();
});

export const requireAuth = vi.fn((req: Request, res: Response, next: NextFunction) => {
    const reqWithUser = req as Request & { user?: { _id: string; role: string; email: string } };
    reqWithUser.user = {
        _id: faker.database.mongodbObjectId(),
        role: 'user',
        email: faker.internet.email(),
    };
    next();
});

export const checkOwnership = vi.fn(() => (req: Request, res: Response, next: NextFunction) => {
    const reqWithUser = req as Request & { user?: { _id: string; role: string; email: string } };
    reqWithUser.user = {
        _id: faker.database.mongodbObjectId(),
        role: 'user',
        email: faker.internet.email(),
    };
    next();
});

export const logout = vi.fn(async (req: Request, res: Response, next: NextFunction) => {
    next();
});

export const refreshToken = vi.fn(async (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: { accessToken: testConfig.generateTestPassword(), refreshToken: testConfig.generateTestPassword() },
    });
});

export const revokeAllTokens = vi.fn(async (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'All tokens revoked successfully',
    });
});
