import { vi } from 'vitest';

// Centralized export of all mocks
export * from './middleware';
export * from './services';
export * from './database';

// Re-export for convenience
import { authMiddlewareMocks, validationMocks, securityMocks, userControllerMocks } from './middleware';
import { serviceMocks, modelMocks, externalMocks } from './services';
import { databaseMocks, dbConfigMocks } from './database';

export const allMocks = {
    middleware: {
        auth: authMiddlewareMocks,
        validation: validationMocks,
        security: securityMocks,
        userControllers: userControllerMocks,
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