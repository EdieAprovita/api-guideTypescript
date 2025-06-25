import { Request, Response, NextFunction } from 'express';

// Tipos específicos para testing
export interface TestUser {
    _id: string;
    role: string;
    email?: string;
}

// Tipos para middleware mocking
export type TestMiddleware = (req: Request, res: Response, next: NextFunction) => void;
export type TestController = (req: Request, res: Response) => void | Promise<void>;

// Utilidades para mocking
export interface AuthMock {
    protect: jest.MockedFunction<TestMiddleware>;
    admin: jest.MockedFunction<TestMiddleware>;
    professional: jest.MockedFunction<TestMiddleware>;
    requireAuth: jest.MockedFunction<TestMiddleware>;
    checkOwnership: jest.MockedFunction<() => TestMiddleware>;
    logout: jest.MockedFunction<TestController>;
    refreshToken: jest.MockedFunction<TestController>;
    revokeAllTokens: jest.MockedFunction<TestController>;
}
