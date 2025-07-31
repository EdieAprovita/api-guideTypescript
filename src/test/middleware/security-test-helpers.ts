import { vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock Express types
export interface MockRequest extends Partial<Request> {
    protocol?: string;
    get?: (name: string) => string | undefined;
    originalUrl?: string;
    headers?: Record<string, string>;
}

export interface MockResponse extends Partial<Response> {
    status: (code: number) => MockResponse;
    json: (data: any) => MockResponse;
    redirect: (status: number, url: string) => MockResponse;
    _status?: number;
    _json?: any;
    _redirect?: { status: number; url: string };
}

export const createMockRequest = (overrides: Partial<MockRequest> = {}): MockRequest => ({
    protocol: 'http',
    get: vi.fn(),
    originalUrl: '/test',
    headers: {},
    ...overrides,
});

export const createMockResponse = (): MockResponse => {
    const res: MockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        redirect: vi.fn().mockReturnThis(),
    };

    // Store the values for assertions
    res.status = vi.fn().mockImplementation((code: number) => {
        res._status = code;
        return res;
    });

    res.json = vi.fn().mockImplementation((data: any) => {
        res._json = data;
        return res;
    });

    res.redirect = vi.fn().mockImplementation((status: number, url: string) => {
        res._redirect = { status, url };
        return res;
    });

    return res;
};

export const createMockNext = (): NextFunction => vi.fn();
