import jwt from "jsonwebtoken";

/**
 * @description Generate a new token for the user
 */

export const generateToken = (_id: string) => {
	return jwt.sign({ _id }, process.env.JWT_SECRET as string, {
		expiresIn: "30d",
	});
};
