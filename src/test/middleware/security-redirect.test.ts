import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { enforceHTTPS } from '../../middleware/security';
import {
    createMockRequest,
    createMockResponse,
    createMockNext,
    type MockRequest,
    type MockResponse,
} from './security-test-helpers';

describe('Security Middleware - HTTPS Enforcement', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;
    let mockNext: NextFunction;
    let originalEnv: string | undefined;
    let originalSecureBaseUrl: string | undefined;

    beforeEach(() => {
        mockReq = createMockRequest();
        mockRes = createMockResponse();
        mockNext = createMockNext();
        originalEnv = process.env.NODE_ENV;
        originalSecureBaseUrl = process.env.SECURE_BASE_URL;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        if (originalSecureBaseUrl) {
            process.env.SECURE_BASE_URL = originalSecureBaseUrl;
        } else {
            delete process.env.SECURE_BASE_URL;
        }
    });

    describe('enforceHTTPS - Basic HTTPS Enforcement', () => {
        it('should allow HTTPS requests to pass through', () => {
            process.env.NODE_ENV = 'production';
            mockReq.secure = true;

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._redirect).toBeUndefined();
        });

        it('should allow non-production environments to pass through', () => {
            process.env.NODE_ENV = 'development';
            mockReq.protocol = 'http';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._redirect).toBeUndefined();
        });

        it('should allow forwarded HTTPS requests', () => {
            process.env.NODE_ENV = 'production';
            mockReq.secure = false;
            mockReq.headers = { 'x-forwarded-proto': 'https' };

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._redirect).toBeUndefined();
        });

        it('should allow forwarded SSL requests', () => {
            process.env.NODE_ENV = 'production';
            mockReq.secure = false;
            mockReq.headers = { 'x-forwarded-ssl': 'on' };

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._redirect).toBeUndefined();
        });

        it('should redirect HTTP requests in production to secure base URL', () => {
            process.env.NODE_ENV = 'production';
            process.env.SECURE_BASE_URL = 'https://example.com';
            mockReq.secure = false;
            mockReq.headers = {};

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://example.com',
            });
        });

        it('should use default HTTPS redirect when no SECURE_BASE_URL is set', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.SECURE_BASE_URL;
            mockReq.secure = false;
            mockReq.headers = {};

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://localhost',
            });
        });

        it('should redirect HTTP requests with complex header scenarios', () => {
            process.env.NODE_ENV = 'production';
            process.env.SECURE_BASE_URL = 'https://secure.example.com';
            
            // Simulate a request that's not secure and has no forwarded headers
            mockReq.secure = false;
            mockReq.headers = {
                'x-forwarded-proto': 'http', // explicitly HTTP
                'host': 'example.com'
            };

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://secure.example.com',
            });
        });
    });
});