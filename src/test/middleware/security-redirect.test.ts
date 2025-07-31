import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { enforceHTTPS } from '../../middleware/security';
import {
    createMockRequest,
    createMockResponse,
    createMockNext,
    type MockRequest,
    type MockResponse,
} from './security-test-helpers';

describe('Security Middleware - HTTPS Enforcement (Redirect Attack Prevention)', () => {
    let mockReq: MockRequest;
    let mockRes: MockResponse;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = createMockRequest();
        mockRes = createMockResponse();
        mockNext = createMockNext();
    });

    describe('enforceHTTPS - Redirect Attack Prevention', () => {
        it('should allow HTTPS requests to pass through', () => {
            mockReq.protocol = 'https';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._status).toBeUndefined();
            expect(mockRes._redirect).toBeUndefined();
        });

        it('should allow non-production environments to pass through', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            mockReq.protocol = 'http';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes._status).toBeUndefined();
            expect(mockRes._redirect).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });

        it('should reject requests with invalid host header format', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('invalid-host-format<script>');

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid host header format',
            });
        });

        it('should reject requests with suspicious characters in host', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com<script>');

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid request parameters',
            });
        });

        it('should reject requests with JavaScript protocol in URL', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/javascript:alert(1)';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid request parameters',
            });
        });

        it('should reject requests with path traversal attempts', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/../../../etc/passwd';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid URL path',
            });
        });

        it('should reject requests with host mismatch', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi
                .fn()
                .mockReturnValueOnce('malicious.com') // host header
                .mockReturnValueOnce('example.com'); // request host

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Host mismatch',
            });
        });

        it('should allow valid HTTPS redirect for production', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/api/test';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://example.com/api/test',
            });
        });

        it('should sanitize URL path and allow redirect', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/api/test?param=value<script>';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://example.com/api/test',
            });
        });

        it('should reject requests with invalid redirect URL format', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('invalid://host');
            mockReq.originalUrl = '/test';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid redirect URL format',
            });
        });

        it('should handle valid host with port', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com:8080');
            mockReq.originalUrl = '/api/test';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._redirect).toEqual({
                status: 302,
                url: 'https://example.com:8080/api/test',
            });
        });

        it('should reject requests with data protocol attempts', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/data:text/html,<script>alert(1)</script>';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid request parameters',
            });
        });

        it('should reject requests with VBScript protocol attempts', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/vbscript:msgbox("XSS")';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid request parameters',
            });
        });

        it('should reject requests with event handler attempts', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/test" onload="alert(1)';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid request parameters',
            });
        });

        it('should reject requests with backslash path traversal', () => {
            process.env.NODE_ENV = 'production';
            mockReq.protocol = 'http';
            mockReq.get = vi.fn().mockReturnValue('example.com');
            mockReq.originalUrl = '/..\\..\\..\\windows\\system32\\config\\sam';

            enforceHTTPS(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRes._status).toBe(400);
            expect(mockRes._json).toEqual({
                success: false,
                message: 'Invalid URL path',
            });
        });
    });
});
