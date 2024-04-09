import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/asyncHandler";
import { validationResult } from "express-validator";
import { HttpError, HttpStatusCode } from "../types/Errors";
import { getErrorMessage } from "../types/modalTypes";
import { postService as PostService } from "../services/PostService";

/**
 * @description Get all posts
 * @name getPosts
 * @route GET /api/posts
 * @access Public
 * @returns {Promise<Response>}
 */

export const getPosts = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const posts = await PostService.getAll();
			res.status(200).json({
				success: true,
				message: "Posts fetched successfully",
				data: posts,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Get a post by id
 * @name getPostById
 * @route GET /api/posts/:id
 * @access Public
 * @returns {Promise<Response>}
 */

export const getPostById = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			const post = await PostService.findById(id);
			res.status(200).json({
				success: true,
				message: "Post fetched successfully",
				data: post,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.NOT_FOUND, getErrorMessage(error)));
		}
	}
);

/**
 * @description Create a new post
 * @name createPost
 * @route POST /api/posts
 * @access Private
 * @returns {Promise<Response>}
 */

export const createPost = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}
		try {
			const post = await PostService.create(req.body);
			res.status(201).json({
				success: true,
				message: "Post created successfully",
				data: post,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

/**
 * @description Add a comment to a post
 * @name addComment
 * @route POST /api/posts/comment/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const addComment = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return next(
				new HttpError(HttpStatusCode.BAD_REQUEST, getErrorMessage(errors.array()[0].msg))
			);
		}
		try {
			const { id } = req.params;
			const userId = (req as any).user?._id;
			const { text, name, avatar } = req.body;
			const comments = await PostService.addComment(id, userId, text, name, avatar);
			res.status(201).json({
				success: true,
				message: "Comment added successfully",
				data: comments,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

/**
 * @description Like a post
 * @name likePost
 * @route PUT /api/posts/like/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const likePost = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const postId = req.params.id;
			const userId = (req as any).user?._id;
			const likes = await PostService.likePost(postId, userId);
			res.status(200).json({
				success: true,
				message: "Post liked successfully",
				data: likes,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

/**
 * @description Unlike a post
 * @name unlikePost
 * @route PUT /api/posts/unlike/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const unlikePost = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const postId = req.params.id;
			const userId = (req as any).user?._id;
			const likes = await PostService.unlikePost(postId, userId);
			res.status(200).json({
				success: true,
				message: "Post unliked successfully",
				data: likes,
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);

/**
 * @description Delete a post by id
 * @name deletePost
 * @route DELETE /api/posts/:id
 * @access Private
 * @returns {Promise<Response>}
 */

export const deletePost = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		try {
			const { id } = req.params;
			await PostService.deleteById(id);
			res.status(200).json({
				success: true,
				message: "Post deleted successfully",
			});
		} catch (error) {
			next(new HttpError(HttpStatusCode.INTERNAL_SERVER_ERROR, getErrorMessage(error)));
		}
	}
);
