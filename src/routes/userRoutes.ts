import express from "express";
import { protect, admin } from "../middleware/authMiddleware";
import { registerUser, loginUser, getUsers, getUserById } from "../controllers/userControllers";

const userRouter = express.Router();

userRouter.post("/register", registerUser);

userRouter.post("/login", loginUser);

userRouter.get("/all", protect, admin, getUsers);

userRouter.get("/:id", protect, admin, getUserById);

export default userRouter;
