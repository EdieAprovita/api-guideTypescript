import mongoose from "mongoose";
const { Schema } = mongoose;

const reviewSchema = new Schema(
	{
		username: {
			type: String,
			required: true,
		},
		rating: {
			type: Number,
			required: true,
		},
		comment: {
			type: String,
			required: true,
		},
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

const Review = mongoose.model("Review", reviewSchema);
export default Review;
