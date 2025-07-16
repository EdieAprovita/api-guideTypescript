import {
    connect as connectTestDB,
    closeDatabase as disconnectTestDB,
    clearDatabase as clearTestDB,
} from './testDb';
import { createAdminUser, generateAuthTokens } from './testFixtures';

export interface AdminAuth {
    adminId: string;
    adminToken: string;
}

// Setup database connection hooks once per test suite
export const setupTestDB = (): void => {
    beforeAll(async () => {
        await connectTestDB();
    });

    afterAll(async () => {
        await disconnectTestDB();
    });
};

// Clear DB and create a fresh admin user/token for each test
export const refreshAdmin = async (): Promise<AdminAuth> => {
    await clearTestDB();
    const admin = await createAdminUser();
    const adminId = admin._id.toString();
    const tokens = await generateAuthTokens(adminId, admin.email, admin.role);
    return { adminId, adminToken: tokens.accessToken };
};
