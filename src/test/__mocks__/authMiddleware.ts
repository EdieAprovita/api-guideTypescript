import { Request, Response, NextFunction } from 'express';

export const protect = jest.fn((req: Request, res: Response, next: NextFunction) => {
    const reqWithUser = req as Request & { user?: { _id: string; role: string } };
    reqWithUser.user = { _id: 'test-user-id', role: 'user' };
    next();
});

export const admin = jest.fn((req: Request, res: Response, next: NextFunction) => next());

export const professional = jest.fn((req: Request, res: Response, next: NextFunction) => next());

export const requireAuth = jest.fn((req: Request, res: Response, next: NextFunction) => next());

export const checkOwnership = jest.fn(() => (req: Request, res: Response, next: NextFunction) => next());

export const logout = jest.fn(async (req: Request, res: Response, next: NextFunction) => {
    next();
});

export const refreshToken = jest.fn(async (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token' },
    });
});

export const revokeAllTokens = jest.fn(async (req: Request, res: Response) => {
    res.json({
        success: true,
        message: 'All tokens revoked successfully',
    });
});
