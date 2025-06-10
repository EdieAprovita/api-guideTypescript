import mongoose, { Document, Types, Schema } from 'mongoose';

export interface ILike {
    username: Types.ObjectId;
}

export interface IComment {
    id?: string;
    username: Types.ObjectId;
    text: string;
    name?: string;
    avatar?: string;
    date?: Date;
}

export interface IPost extends Document {
    _id: string;
    username?: Types.ObjectId;
    text: string;
    name?: string;
    avatar?: string;
    likes: ILike[];
    comments: IComment[];
    date?: Date;
}

const postSchema = new Schema<IPost>(
    {
        username: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        text: {
            type: String,
            required: true,
        },
        name: {
            type: String,
        },
        avatar: {
            type: String,
        },
        likes: [
            {
                username: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
            },
        ],
        comments: [
            {
                username: {
                    type: Schema.Types.ObjectId,
                    ref: 'User',
                },
                text: {
                    type: String,
                    required: true,
                },
                name: {
                    type: String,
                },
                avatar: {
                    type: String,
                },
                date: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    { timestamps: true }
);

export const Post = mongoose.model<IPost>('Post', postSchema);
