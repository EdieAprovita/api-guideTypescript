import { Request, Response, NextFunction } from 'express';

export const protect = jest.fn((req: any, res: Response, next: NextFunction) => {
    req.user = { _id: 'test-user-id', role: 'user' };
    next();
});

export const admin = jest.fn((req: Request, res: Response, next: NextFunction) => next());

export const professional = jest.fn((req: Request, res: Response, next: NextFunction) => next());

export const requireAuth = jest.fn((req: Request, res: Response, next: NextFunction) => next());

export const checkOwnership = jest.fn(() => (req: Request, res: Response, next: NextFunction) => next());

export const logout = jest.fn((req: Request, res: Response, next: NextFunction) => next());

export const refreshToken = jest.fn((req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token' },
    });
});

export const revokeAllTokens = jest.fn((req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'All tokens revoked successfully',
    });
});
