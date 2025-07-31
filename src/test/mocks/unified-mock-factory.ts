/**
 * Unified Mock Factory - Single Source of Truth for All Test Mocks
 *
 * This factory creates consistent, type-safe mocks for all services, models,
 * and utilities used throughout the application. It ensures no code duplication
 * and maintains consistency across all test files.
 */

import { vi } from 'vitest';
import type {
    MockedCacheService,
    MockedRedis,
    MockedTokenService,
    MockedUserService,
    MockedCacheAlertService,
    MockedUserModel,
    MockedJWT,
    MockedLogger,
    MockedAuthMiddleware,
    MockedValidationMiddleware,
    MockedMiddleware,
    TestUser,
    TestRequest,
    TestResponse,
    MockFactoryOptions,
} from '../types/test-types';

// Define constants directly here to avoid circular dependency
const TEST_CONSTANTS = {
    ADMIN_USER_ID: '507f1f77bcf86cd799439011',
    ADMIN_EMAIL: 'admin@test.com',
    ADMIN_USERNAME: 'testadmin',
    ADMIN_TOKEN: 'master_test_token_admin',
    ADMIN_REFRESH_TOKEN: 'master_refresh_token_admin',

    PROFESSIONAL_USER_ID: '507f1f77bcf86cd799439012',
    PROFESSIONAL_EMAIL: 'professional@test.com',
    PROFESSIONAL_USERNAME: 'testprofessional',

    USER_ID: '507f1f77bcf86cd799439013',
    USER_EMAIL: 'user@test.com',
    USER_USERNAME: 'testuser',

    JWT_SECRET: 'master_test_secret_key_12345',
    JWT_REFRESH_SECRET: 'master_refresh_secret_12345',

    BUSINESS_ID: '507f1f77bcf86cd799439020',
    RESTAURANT_ID: '507f1f77bcf86cd799439021',
    REVIEW_ID: '507f1f77bcf86cd799439022',
} as const;

// ============================================================================
// FACTORY CLASS
// ============================================================================

// Common mock user creation function
const createMockUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: TEST_CONSTANTS.ADMIN_USER_ID,
    userId: TEST_CONSTANTS.ADMIN_USER_ID,
    username: TEST_CONSTANTS.ADMIN_USERNAME,
    email: TEST_CONSTANTS.ADMIN_EMAIL,
    role: 'admin',
    isAdmin: true,
    isActive: true,
    isDeleted: false,
    photo: 'default.png',
    matchPassword: vi.fn().mockResolvedValue(true),
    save: vi.fn().mockResolvedValue({} as TestUser),
    ...overrides,
});

export class UnifiedMockFactory {
    private options: Required<MockFactoryOptions>;

    constructor(options: MockFactoryOptions = {}) {
        this.options = {
            useRealTypes: true,
            mockExternalDependencies: true,
            enableLogging: false,
            ...options,
        };
    }

    // ========================================================================
    // REDIS MOCKS
    // ========================================================================

    createRedisMock(): MockedRedis {
        const mockRedis: MockedRedis = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue('OK' as const),
            setex: vi.fn().mockResolvedValue('OK' as const),
            del: vi.fn().mockResolvedValue(1),
            exists: vi.fn().mockResolvedValue(0),
            expire: vi.fn().mockResolvedValue(1),
            scan: vi.fn().mockResolvedValue(['0', []] as [string, string[]]),
            info: vi.fn().mockResolvedValue('# Memory\nused_memory_human:1M\nuptime_in_seconds:3600'),
            dbsize: vi.fn().mockResolvedValue(0),
            flushdb: vi.fn().mockResolvedValue('OK' as const),
            quit: vi.fn().mockResolvedValue('OK' as const),
            on: vi.fn().mockReturnThis(),
            off: vi.fn().mockReturnThis(),
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            ping: vi.fn().mockResolvedValue('PONG' as const),
            status: 'ready',
        };

        return mockRedis;
    }

    createRedisMockModule() {
        const mockRedis = this.createRedisMock();

        const MockedRedisConstructor = vi.fn().mockImplementation(() => mockRedis);

        return {
            __esModule: true,
            default: MockedRedisConstructor,
        };
    }

    // ========================================================================
    // CACHE SERVICE MOCKS
    // ========================================================================

    createCacheServiceMock(): MockedCacheService {
        return {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
            setWithTags: vi.fn().mockResolvedValue(undefined),
            invalidate: vi.fn().mockResolvedValue(undefined),
            invalidatePattern: vi.fn().mockResolvedValue(undefined),
            invalidateByTag: vi.fn().mockResolvedValue(undefined),
            getStats: vi.fn().mockResolvedValue({
                hitRatio: 85.5,
                totalRequests: 1000,
                cacheSize: 250,
                memoryUsage: '2.5MB',
                uptime: 3600,
            }),
            flush: vi.fn().mockResolvedValue(undefined),
            exists: vi.fn().mockResolvedValue(false),
            expire: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
        };
    }

    createCacheServiceMockModule() {
        const mockInstance = this.createCacheServiceMock();

        const MockedCacheServiceConstructor = vi.fn().mockImplementation(() => mockInstance);

        return {
            __esModule: true,
            CacheService: MockedCacheServiceConstructor,
            default: mockInstance,
            cacheService: mockInstance,
            CacheStats: {},
            CacheOptions: {},
        };
    }

    // ========================================================================
    // CACHE ALERT SERVICE MOCKS
    // ========================================================================

    createCacheAlertServiceMock(): MockedCacheAlertService {
        return {
            startMonitoring: vi.fn(),
            stopMonitoring: vi.fn(),
            checkMetrics: vi.fn().mockResolvedValue(undefined),
            getConfig: vi.fn().mockReturnValue({
                enabled: true,
                checkIntervalSeconds: 60,
                thresholds: {
                    minHitRatio: 70,
                    maxMemoryUsage: '50M',
                    maxResponseTime: 100,
                    minCacheSize: 10,
                },
            }),
            updateConfig: vi.fn(),
            getMonitoringStatus: vi.fn().mockReturnValue({
                enabled: true,
                running: false,
                lastCheck: new Date(),
                activeAlerts: 0,
                checkInterval: 60,
            }),
            getActiveAlerts: vi.fn().mockReturnValue([]),
            getAllAlerts: vi.fn().mockReturnValue([]),
            parseMemoryToMB: vi.fn().mockImplementation((memory: string) => {
                const match = memory.match(/(\d+(?:\.\d+)?)/);
                return match ? parseFloat(match[1]) : 0;
            }),
        };
    }

    createCacheAlertServiceMockModule() {
        const mockInstance = this.createCacheAlertServiceMock();

        const MockedCacheAlertServiceConstructor = vi.fn().mockImplementation(() => mockInstance);

        return {
            __esModule: true,
            CacheAlertService: MockedCacheAlertServiceConstructor,
            default: mockInstance,
            AlertConfig: {},
            AlertThresholds: {},
            Alert: {},
        };
    }

    // ========================================================================
    // TOKEN SERVICE MOCKS
    // ========================================================================

    createTokenServiceMock(): MockedTokenService {
        return {
            generateTokens: vi.fn().mockImplementation(async (userId: string, email: string, role: string) => ({
                accessToken: `access_token_${userId}`,
                refreshToken: `refresh_token_${userId}`,
            })),

            generateTokenPair: vi.fn().mockImplementation(async (payload: Record<string, unknown>) => {
                const userId = (payload.userId as string) || TEST_CONSTANTS.ADMIN_USER_ID;
                return {
                    accessToken: `access_token_${userId}`,
                    refreshToken: `refresh_token_${userId}`,
                };
            }),

            verifyAccessToken: vi.fn().mockImplementation(async (token: string) => {
                const userId = token.includes(TEST_CONSTANTS.ADMIN_USER_ID)
                    ? TEST_CONSTANTS.ADMIN_USER_ID
                    : TEST_CONSTANTS.USER_ID;

                return {
                    userId,
                    email:
                        userId === TEST_CONSTANTS.ADMIN_USER_ID
                            ? TEST_CONSTANTS.ADMIN_EMAIL
                            : TEST_CONSTANTS.USER_EMAIL,
                    role: userId === TEST_CONSTANTS.ADMIN_USER_ID ? 'admin' : 'user',
                };
            }),

            verifyRefreshToken: vi.fn().mockImplementation(async (token: string) => {
                const userId = token.includes(TEST_CONSTANTS.ADMIN_USER_ID)
                    ? TEST_CONSTANTS.ADMIN_USER_ID
                    : TEST_CONSTANTS.USER_ID;

                return {
                    userId,
                    email:
                        userId === TEST_CONSTANTS.ADMIN_USER_ID
                            ? TEST_CONSTANTS.ADMIN_EMAIL
                            : TEST_CONSTANTS.USER_EMAIL,
                    role: userId === TEST_CONSTANTS.ADMIN_USER_ID ? 'admin' : 'user',
                    type: 'refresh',
                };
            }),

            refreshTokens: vi.fn().mockImplementation(async (refreshToken: string) => {
                const userId = refreshToken.includes(TEST_CONSTANTS.ADMIN_USER_ID)
                    ? TEST_CONSTANTS.ADMIN_USER_ID
                    : TEST_CONSTANTS.USER_ID;

                return {
                    accessToken: `new_access_token_${userId}`,
                    refreshToken: `new_refresh_token_${userId}`,
                };
            }),

            blacklistToken: vi.fn().mockResolvedValue(undefined),
            isTokenBlacklisted: vi.fn().mockResolvedValue(false),
            revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
            isUserTokensRevoked: vi.fn().mockResolvedValue(false),
            revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
            clearAllForTesting: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
        };
    }

    createTokenServiceMockModule() {
        const mockInstance = this.createTokenServiceMock();

        return {
            __esModule: true,
            default: mockInstance,
            TokenService: vi.fn().mockImplementation(() => mockInstance),
        };
    }

    // ========================================================================
    // USER SERVICE MOCKS
    // ========================================================================

    createUserServiceMock(): MockedUserService {
        return {
            registerUser: vi.fn().mockImplementation(async (userData: unknown) => {
                const data = userData as { email: string; username?: string; password?: string };

                // Simulate duplicate email error
                if (data.email === 'existing@example.com') {
                    return {
                        success: false,
                        error: 'User with this email already exists',
                    };
                }

                const user = createMockUser({
                    email: data.email,
                    username: data.username || 'testuser',
                });
                return {
                    success: true,
                    user,
                };
            }),

            loginUser: vi.fn().mockImplementation(async (credentials: { email: string; password: string }) => {
                if (credentials.password === 'wrongpassword') {
                    return {
                        success: false,
                        error: 'Invalid credentials',
                    };
                }
                const user = createMockUser({ email: credentials.email });
                return {
                    success: true,
                    user,
                    tokens: {
                        access: 'mock-access-token',
                        refresh: 'mock-refresh-token',
                    },
                };
            }),

            getUserById: vi.fn().mockImplementation(async (id: string) => {
                return id === 'nonexistent' ? null : createMockUser({ _id: id, userId: id });
            }),

            updateUser: vi.fn().mockImplementation(async (id: string, updateData: unknown) => {
                const user = createMockUser({ _id: id, userId: id, ...(updateData as Partial<TestUser>) });
                return {
                    success: true,
                    user,
                };
            }),

            deleteUser: vi.fn().mockImplementation(async (id: string) => {
                if (id === 'nonexistent') {
                    return {
                        success: false,
                        error: 'User not found',
                    };
                }
                const user = createMockUser({ _id: id, userId: id });
                return {
                    success: true,
                    user,
                };
            }),

            getAllUsers: vi.fn().mockImplementation(async () => {
                return [createMockUser(), createMockUser({ _id: 'user2', userId: 'user2', email: 'user2@test.com' })];
            }),
        };
    }

    createUserServiceMockModule() {
        const mockInstance = this.createUserServiceMock();

        const MockedUserServiceConstructor = vi.fn().mockImplementation(() => mockInstance);

        return {
            __esModule: true,
            UserService: MockedUserServiceConstructor,
            default: mockInstance,
        };
    }

    // ========================================================================
    // USER MODEL MOCKS
    // ========================================================================

    createUserModelMock(): MockedUserModel {
        return {
            create: vi.fn().mockImplementation(async (userData: unknown) => {
                return createMockUser(userData as Partial<TestUser>);
            }),

            findOne: vi.fn().mockImplementation(async (query: unknown) => {
                const q = query as { email?: string; _id?: string };
                if (q.email === 'nonexistent@test.com' || q._id === 'nonexistent') {
                    return null;
                }
                return createMockUser();
            }),

            findById: vi.fn().mockImplementation(async (id: string) => {
                return id === 'nonexistent' ? null : createMockUser({ _id: id, userId: id });
            }),

            findByIdAndUpdate: vi.fn().mockImplementation(async (id: string, update: unknown, options?: unknown) => {
                return id === 'nonexistent'
                    ? null
                    : createMockUser({ _id: id, userId: id, ...(update as Partial<TestUser>) });
            }),

            findByIdAndDelete: vi.fn().mockImplementation(async (id: string) => {
                return id === 'nonexistent' ? null : createMockUser({ _id: id, userId: id });
            }),

            find: vi.fn().mockResolvedValue([createMockUser()]),
        };
    }

    createUserModelMockModule() {
        const mockInstance = this.createUserModelMock();

        return {
            __esModule: true,
            User: mockInstance,
            default: mockInstance,
            IUser: {},
        };
    }

    // ========================================================================
    // JWT MOCKS
    // ========================================================================

    createJWTMock(): MockedJWT {
        return {
            sign: vi.fn().mockImplementation((payload: Record<string, unknown>, secret: string, options?: unknown) => {
                const userId = (payload.userId as string) || TEST_CONSTANTS.ADMIN_USER_ID;
                const type = (payload.type as string) || 'access';
                return `${type}_token_${userId}`;
            }),

            verify: vi.fn().mockImplementation((token: string, secret: string) => {
                const userId = token.includes(TEST_CONSTANTS.ADMIN_USER_ID)
                    ? TEST_CONSTANTS.ADMIN_USER_ID
                    : TEST_CONSTANTS.USER_ID;

                const type = token.includes('refresh') ? 'refresh' : 'access';

                if (token.includes('invalid')) {
                    throw new Error('invalid signature');
                }

                return {
                    userId,
                    email:
                        userId === TEST_CONSTANTS.ADMIN_USER_ID
                            ? TEST_CONSTANTS.ADMIN_EMAIL
                            : TEST_CONSTANTS.USER_EMAIL,
                    role: userId === TEST_CONSTANTS.ADMIN_USER_ID ? 'admin' : 'user',
                    type,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 86400,
                };
            }),

            decode: vi.fn().mockImplementation((token: string) => {
                if (token.includes('invalid')) {
                    return null;
                }
                return this.createJWTMock().verify(token, 'secret');
            }),
        };
    }

    createJWTMockModule() {
        const mockInstance = this.createJWTMock();

        return {
            __esModule: true,
            default: mockInstance,
            ...mockInstance,
        };
    }

    // ========================================================================
    // LOGGER MOCKS
    // ========================================================================

    createLoggerMock(): MockedLogger {
        const createLogFn = (level: string) =>
            vi.fn().mockImplementation((message: string, ...args: unknown[]) => {
                if (this.options.enableLogging) {
                    console.log(`[${level.toUpperCase()}] ${message}`, ...args);
                }
            });

        return {
            info: createLogFn('info'),
            error: createLogFn('error'),
            warn: createLogFn('warn'),
            debug: createLogFn('debug'),
        };
    }

    createLoggerMockModule() {
        const mockInstance = this.createLoggerMock();

        return {
            __esModule: true,
            default: mockInstance,
        };
    }

    // ========================================================================
    // MIDDLEWARE MOCKS
    // ========================================================================

    createAuthMiddlewareMock(): MockedAuthMiddleware {
        const createAuthMiddleware = (requiredRole?: 'admin' | 'professional'): MockedMiddleware => {
            return vi.fn().mockImplementation((req: TestRequest, res: TestResponse, next: () => void) => {
                // Extract token from request
                let token: string | undefined;

                if (req.headers?.authorization?.startsWith('Bearer ')) {
                    token = req.headers.authorization.split(' ')[1];
                } else if (req.cookies?.jwt) {
                    token = req.cookies.jwt;
                }

                // If no token and auth is required, return 401
                if (!token && requiredRole) {
                    return res.status(401).json({
                        success: false,
                        message: 'Not authorized to access this route',
                    });
                }

                // Set user based on token or default to admin for simplicity
                const userId = TEST_CONSTANTS.ADMIN_USER_ID; // Default to admin for tests

                req.user = {
                    _id: userId,
                    userId,
                    username: TEST_CONSTANTS.ADMIN_USERNAME,
                    email: TEST_CONSTANTS.ADMIN_EMAIL,
                    role: 'admin',
                    isAdmin: true,
                    isActive: true,
                    isDeleted: false,
                };

                // Check role if required
                if (requiredRole && req.user.role !== requiredRole && req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: `${requiredRole} access required`,
                    });
                }

                next();
            });
        };

        const mockAsyncHandler: MockedMiddleware = vi
            .fn()
            .mockImplementation(async (req: TestRequest, res: TestResponse) => {
                res.status(200).json({
                    success: true,
                    message: 'Mock response',
                });
            });

        return {
            protect: createAuthMiddleware(),
            admin: createAuthMiddleware('admin'),
            professional: createAuthMiddleware('professional'),
            requireAuth: createAuthMiddleware(),
            checkOwnership: vi.fn(() => createAuthMiddleware()),
            logout: mockAsyncHandler,
            refreshToken: mockAsyncHandler,
            revokeAllTokens: mockAsyncHandler,
        };
    }

    createValidationMiddlewareMock(): MockedValidationMiddleware {
        const createValidationMiddleware = (): MockedMiddleware =>
            vi.fn().mockImplementation((req: TestRequest, res: TestResponse, next: () => void) => next());

        return {
            validate: vi.fn().mockImplementation((schema: unknown) => createValidationMiddleware()),
            sanitizeInput: vi.fn().mockImplementation((options: unknown) => [createValidationMiddleware()]),
            createRateLimit: vi.fn().mockImplementation((options: unknown) => createValidationMiddleware()),
            rateLimits: {
                api: createValidationMiddleware(),
                auth: createValidationMiddleware(),
                upload: createValidationMiddleware(),
                search: createValidationMiddleware(),
                register: createValidationMiddleware(),
            },
            handleValidationError: createValidationMiddleware(),
            securityHeaders: createValidationMiddleware(),
            validateInputLength: vi.fn().mockImplementation((options: unknown) => createValidationMiddleware()),
        };
    }

    // ========================================================================
    // EXPRESS MOCKS
    // ========================================================================

    createExpressRequestMock(overrides: Partial<TestRequest> = {}): TestRequest {
        return {
            headers: {},
            cookies: {},
            body: {},
            params: {},
            query: {},
            ...overrides,
        };
    }

    createExpressResponseMock(): TestResponse {
        const response = {} as TestResponse;
        response.status = vi.fn().mockReturnValue(response);
        response.json = vi.fn().mockReturnValue(response);
        response.cookie = vi.fn().mockReturnValue(response);
        response.clearCookie = vi.fn().mockReturnValue(response);
        response.send = vi.fn().mockReturnValue(response);

        return response;
    }

    // ========================================================================
    // UTILITY MOCKS
    // ========================================================================

    createGenerateTokenMock() {
        return {
            __esModule: true,
            default: vi.fn().mockResolvedValue(undefined),
            generateTokenAndSetCookie: vi.fn().mockResolvedValue(undefined),
        };
    }

    createExpressRateLimitMock() {
        return {
            __esModule: true,
            default: vi.fn(() => (req: TestRequest, res: TestResponse, next: () => void) => next()),
        };
    }
}

// ============================================================================
// SINGLETON FACTORY INSTANCE
// ============================================================================

export const mockFactory = new UnifiedMockFactory();
