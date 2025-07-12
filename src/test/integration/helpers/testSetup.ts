import { connect as connectTestDB, closeDatabase as disconnectTestDB, clearDatabase as clearTestDB } from './testDb';
import { createAdminUser, generateAuthTokens } from './testFixtures';

export interface AdminAuth {
    adminId: string;
    adminToken: string;
}

export const setupAdmin = (): AdminAuth => {
    const auth: AdminAuth = { adminId: '', adminToken: '' };

    beforeAll(async () => {
        await connectTestDB();
    });

    beforeEach(async () => {
        await clearTestDB();
        const admin = await createAdminUser();
        auth.adminId = admin._id.toString();
        const tokens = await generateAuthTokens(auth.adminId, admin.email, admin.role);
        auth.adminToken = tokens.accessToken;
    });

    afterAll(async () => {
        await disconnectTestDB();
    });

    return auth;
};
