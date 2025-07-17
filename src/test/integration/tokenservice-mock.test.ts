// Mock TokenService directly in the test file
jest.mock('../../services/TokenService', () => ({
    __esModule: true,
    default: {
        verifyAccessToken: jest.fn().mockImplementation(async (token) => {
            console.log('=== TokenService.verifyAccessToken MOCK CALLED ===');
            console.log('Token received:', token ? token.substring(0, 20) + '...' : 'null/undefined');
            
            // Return valid payload that matches the expected interface
            const payload = {
                userId: '675a1b2c3d4e5f6789012345',
                email: 'test@example.com',
                role: 'user',
            };
            console.log('Returning payload:', payload);
            return payload;
        }),
        isUserTokensRevoked: jest.fn().mockResolvedValue(false),
        isTokenBlacklisted: jest.fn().mockResolvedValue(false),
        blacklistToken: jest.fn().mockResolvedValue(true),
        revokeAllUserTokens: jest.fn().mockResolvedValue(true),
        generateTokenPair: jest.fn().mockResolvedValue({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
        }),
    },
}));

// Simple test to verify TokenService mock
import TokenService from '../../services/TokenService';

describe('TokenService Mock Test', () => {
    it('should use the mock', async () => {
        console.log('Test - TokenService type:', typeof TokenService);
        console.log('Test - TokenService.verifyAccessToken type:', typeof TokenService.verifyAccessToken);
        
        try {
            const result = await TokenService.verifyAccessToken('test-token');
            console.log('Test - Result:', result);
            expect(result).toBeDefined();
            expect(result.userId).toBe('675a1b2c3d4e5f6789012345');
        } catch (error) {
            console.error('Test - Error:', error);
            throw error;
        }
    });
});
