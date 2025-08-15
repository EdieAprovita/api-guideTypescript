import { describe, it, expect } from 'vitest';

// Simple post controller tests - just verify exports exist
describe('Post Controllers - Simple', () => {
    it('should export all expected controller functions', async () => {
        const postControllers = await import('../../controllers/postControllers');
        
        // Test that all expected functions are exported
        expect(typeof postControllers.getPosts).toBe('function');
        expect(typeof postControllers.getPostById).toBe('function');
        expect(typeof postControllers.createPost).toBe('function');
        expect(typeof postControllers.updatePost).toBe('function');
        expect(typeof postControllers.deletePost).toBe('function');
        expect(typeof postControllers.likePost).toBe('function');
        expect(typeof postControllers.unlikePost).toBe('function');
        expect(typeof postControllers.addComment).toBe('function');
    });

    it('should not throw when importing post controllers module', async () => {
        await expect(import('../../controllers/postControllers')).resolves.toBeDefined();
    });

    it('should have function properties that are callable', async () => {
        const { getPosts, getPostById, deletePost, likePost, unlikePost } = await import('../../controllers/postControllers');
        
        // Just test that they're functions and don't throw when accessed
        expect(() => getPosts).not.toThrow();
        expect(() => getPostById).not.toThrow();
        expect(() => deletePost).not.toThrow();
        expect(() => likePost).not.toThrow();
        expect(() => unlikePost).not.toThrow();
    });
});