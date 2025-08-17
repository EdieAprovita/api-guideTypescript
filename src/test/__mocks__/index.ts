import { vi } from 'vitest';

// Centralized export of all mocks
export * from './middleware';
export * from './services';
export * from './database';

// Re-export for convenience
import { authMiddlewareMocks, validationMocks, securityMocks, userControllerMocks, cacheMocks } from './middleware';
import { serviceMocks, modelMocks, externalMocks } from './services';
import { databaseMocks, dbConfigMocks } from './database';

export const allMocks = {
    middleware: {
        auth: authMiddlewareMocks,
        validation: validationMocks,
        security: securityMocks,
        userControllers: userControllerMocks,
        cache: cacheMocks,
    },
    services: serviceMocks,
    models: modelMocks,
    external: externalMocks,
    database: databaseMocks,
    config: {
        db: dbConfigMocks,
    },
};

// Helper function to reset all mocks
export const resetAllMocks = () => {
    vi.clearAllMocks();
};

// Helper function to restore all mocks
export const restoreAllMocks = () => {
    vi.restoreAllMocks();
};

// Mock CacheWarmingService specifically
export const mockCacheWarmingService = {
    startAutoWarming: vi.fn().mockResolvedValue(undefined),
    stopAutoWarming: vi.fn().mockReturnValue(undefined),
    warmUpCriticalData: vi.fn().mockResolvedValue({
        success: true,
        duration: 1000,
        itemsWarmed: 10,
        errors: [],
    }),
    warmSpecificData: vi.fn().mockResolvedValue(5),
    getWarmingStats: vi.fn().mockReturnValue({
        isWarming: false,
        lastWarmingTime: null,
        autoWarmingActive: false,
    }),
};
