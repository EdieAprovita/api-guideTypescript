import { beforeAll, afterAll } from 'vitest';

export interface AdminAuth {
    adminId: string;
    adminObjectId: import('mongoose').Types.ObjectId;
    adminToken: string;
}

// Simple database setup - no longer needed for simplified tests
export const setupTestDB = (): void => {
    beforeAll(async () => {
        // No database setup needed for endpoint-only tests
    });

    afterAll(async () => {
        // No cleanup needed
    });
};
