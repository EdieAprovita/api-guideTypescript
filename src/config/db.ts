import mongoose from "mongoose";
import { colorTheme } from "../types/colorTheme";

import { DataBaseError } from "../types/Errors";

/**
 * @description  Connect to MongoDB database
 */

const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.DB);

		console.log(
			colorTheme.info.bold(
				`MongoDB Connected: ${conn.connections[0].name}`.cyan.underline
			)
		);
	} catch (error) {
		console.error(`Error: ${error.message}`.red.underline.underline);
		throw new DataBaseError("Error connecting to the database");
	}
};

export default connectDB;
