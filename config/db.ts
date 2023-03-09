import mongoose from 'mongoose';

/**
 * @description: Connect to MongoDB
 */

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.DB as string, );
		console.log('MongoDB Connected...');
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
};

export default connectDB;