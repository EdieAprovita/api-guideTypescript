import { faker } from '@faker-js/faker';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

// Mock authMiddleware para que req.user siempre tenga _id
jest.mock('../../middleware/authMiddleware', () => ({
    protect: (req: Request, _res: Response, next: NextFunction) => {
        req.user = { _id: 'user', role: 'admin' };
        next();
    },
    admin: (_req: Request, _res: Response, next: NextFunction) => next(),
    professional: (_req: Request, _res: Response, next: NextFunction) => next(),
    refreshToken: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    logout: (_req: Request, res: Response) => res.status(200).json({ success: true }),
    revokeAllTokens: (_req: Request, res: Response) => res.status(200).json({ success: true }),
}));

// Mock services con tipos explícitos
jest.mock('../../services/PostService', () => ({
    postService: {
        getAll: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        updateById: jest.fn(),
        deleteById: jest.fn(),
        addComment: jest.fn(),
        likePost: jest.fn(),
        unlikePost: jest.fn(),
    },
}));

import { createMockPost } from '../utils/testHelpers';
import app from '../../app';
import { postService } from '../../services/PostService';

describe('Post Controllers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Get all posts', () => {
        it('should get all posts', async () => {
            const mockPosts = [createMockPost(), createMockPost()];
            (postService.getAll as jest.Mock).mockResolvedValueOnce(mockPosts);
            const response = await request(app).get('/api/v1/posts');
            expect(response.status).toBe(200);
            expect(postService.getAll).toHaveBeenCalled();
            expect(response.body).toEqual({
                success: true,
                message: 'Posts fetched successfully',
                data: mockPosts,
            });
        });
    });

    describe('Get post by id', () => {
        it('should get post by id', async () => {
            const mockPost = createMockPost();
            (postService.findById as jest.Mock).mockResolvedValueOnce(mockPost);
            const response = await request(app).get(`/api/v1/posts/${mockPost._id}`);
            expect(response.status).toBe(200);
            expect(postService.findById).toHaveBeenCalledWith(mockPost._id);
            expect(response.body).toEqual({
                success: true,
                message: 'Post fetched successfully',
                data: mockPost,
            });
        });
    });

    describe('Create post', () => {
        it('should create a new post', async () => {
            const postData = {
                title: 'Test Post',
                content: 'This is a test post content',
                author: faker.database.mongodbObjectId(),
                tags: ['test', 'example'],
            };
            const createdPost = { ...postData, _id: 'post123' };
            (postService.create as jest.Mock).mockResolvedValueOnce(createdPost);
            const response = await request(app).post('/api/v1/posts').send(postData);
            expect(response.status).toBe(201);
            expect(postService.create).toHaveBeenCalledWith(postData);
            expect(response.body).toEqual({
                success: true,
                message: 'Post created successfully',
                data: createdPost,
            });
        });
    });

    describe('Update post', () => {
        it('should update post by id', async () => {
            const postId = 'post123';
            const updateData = {
                title: 'Updated Post',
                content: 'Updated content',
            };
            const updatedPost = { ...updateData, _id: postId };
            (postService.updateById as jest.Mock).mockResolvedValueOnce(updatedPost);
            const response = await request(app).put(`/api/v1/posts/${postId}`).send(updateData);
            expect(response.status).toBe(200);
            expect(postService.updateById).toHaveBeenCalledWith(postId, updateData);
            expect(response.body).toEqual({
                success: true,
                message: 'Post updated successfully',
                data: updatedPost,
            });
        });
    });

    describe('Delete post', () => {
        it('should delete post by id', async () => {
            const postId = 'post123';
            (postService.deleteById as jest.Mock).mockResolvedValueOnce(undefined);
            const response = await request(app).delete(`/api/v1/posts/${postId}`);
            expect(response.status).toBe(200);
            expect(postService.deleteById).toHaveBeenCalledWith(postId);
            expect(response.body).toEqual({
                success: true,
                message: 'Post deleted successfully',
            });
        });
    });

    describe('Like post', () => {
        it('should like a post', async () => {
            const postId = 'post123';
            (postService.likePost as jest.Mock).mockResolvedValueOnce([]);
            const response = await request(app)
                .post(`/api/v1/posts/like/${postId}`)
                .set('Authorization', 'Bearer mock-token');
            expect(response.status).toBe(200);
            expect(postService.likePost).toHaveBeenCalledWith(postId, 'user');
        });
    });

    describe('Unlike post', () => {
        it('should unlike a post', async () => {
            const postId = 'post123';
            (postService.unlikePost as jest.Mock).mockResolvedValueOnce([]);
            const response = await request(app)
                .post(`/api/v1/posts/unlike/${postId}`)
                .set('Authorization', 'Bearer mock-token');
            expect(response.status).toBe(200);
            expect(postService.unlikePost).toHaveBeenCalledWith(postId, 'user');
        });
    });

    describe('Add comment', () => {
        it('should add comment to post', async () => {
            const postId = 'post123';
            const commentData = {
                text: 'Great post!',
                name: 'Test User',
                avatar: 'avatar.jpg',
            };
            const addedComment = { ...commentData, _id: 'comment123' };
            (postService.addComment as jest.Mock).mockResolvedValueOnce(addedComment);
            const response = await request(app).post(`/api/v1/posts/comment/${postId}`).send(commentData);
            expect(response.status).toBe(201);
            expect(postService.addComment).toHaveBeenCalledWith(
                postId,
                'user',
                commentData.text,
                commentData.name,
                commentData.avatar
            );
            expect(response.body).toEqual({
                success: true,
                message: 'Comment added successfully',
                data: addedComment,
            });
        });
    });
});
