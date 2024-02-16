import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import connectDB from "./config/db";
import { errorHandler, notFound } from "./middleware/errorHandler";
import userRoutes from "./routes/userRoutes";
import businessRoutes from "./routes/businessRoutes";
import recipesRoutes from "./routes/recipesRoutes";

dotenv.config();

connectDB();

const app = express();

if (process.env.NODE_ENV === "development") {
	app.use(morgan("dev"));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

//CORS
app.use(
	cors({
		credentials: true,
		origin: process.env.FRONTEND_URL,
	})
);

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "client/build")));
	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname, "client", "build", "index.html"));
	});
} else {
	app.get("/api/v1", (req, res) => {
		res.send("API is running");
	});
}

// Routes
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/business", businessRoutes);
app.use("/api/v1/recipes", recipesRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

export default app;
