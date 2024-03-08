import BaseService from "./BaseService";
import { BadRequestError } from "../types/Errors";
import { IPost, Post } from "../models/Post";

class PostService extends BaseService<IPost> {
	constructor() {
		super(Post);
	}

	async likePost(postId, userId) {
		const post = await this.findById(postId);
		if (!post) throw new BadRequestError("Post not found");

		const alreadyLiked = post.likes.some(like => like.username.toString() === userId);
		if (alreadyLiked) throw new BadRequestError("Post already liked");

		post.likes.unshift({ username: userId });
		await post.save();
		return post.likes;
	}

	async unlikePost(postId, userId) {
		const post = await this.findById(postId);
		if (!post) throw new BadRequestError("Post not found");

		const alreadyLiked = post.likes.some(like => like.username.toString() === userId);
		if (!alreadyLiked) throw new BadRequestError("Post not liked");

		post.likes = post.likes.filter(like => like.username.toString() !== userId);
		await post.save();
		return post.likes;
	}

	async addComment(postId, userId, text, name, avatar) {
		const post = await this.findById(postId);
		if (!post) throw new BadRequestError("Post not found");

		const newComment = {
			username: userId,
			text,
			name,
			avatar,
		};

		post.comments.unshift(newComment);
		await post.save();
		return post.comments;
	}

	async removeComment(postId, commentId, userId) {
		const post = await this.findById(postId);
		if (!post) throw new BadRequestError("Post not found");

		const comment = post.comments.find(comment => comment.id === commentId);
		if (!comment) throw new BadRequestError("Comment not found");
		if (comment.username.toString() !== userId)
			throw new BadRequestError("User not authorized");

		post.comments = post.comments.filter(comment => comment.id !== commentId);
		await post.save();
		return post.comments;
	}
}

export const postService = new PostService();
