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
    content?: string; // Virtual alias for `text` (frontend compat)
    name?: string;
    avatar?: string;
    likes: ILike[];
    comments: IComment[];
    date?: Date;
    createdAt?: Date;
    updatedAt?: Date;
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

// Virtual: `content` aliases `text` for frontend compatibility
postSchema
    .virtual('content')
    .get(function (this: IPost) {
        return this.text;
    })
    .set(function (this: IPost, value: string) {
        this.text = value;
    });

// Expose virtuals in JSON/Object serialization
postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

export const Post = (mongoose.models.Post as mongoose.Model<IPost>) || mongoose.model<IPost>('Post', postSchema);
