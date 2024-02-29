import express from "express";
import userRoutes from "./userRoutes";
import businessRoutes from "./businessRoutes";
import recipesRoutes from "./recipesRoutes";
import marketsRoutes from "./marketsRoutes";
import restaurantRoutes from "./restaurantRoutes";
import doctorsRoutes from "./doctorsRoutes";
import professionRoutes from "./professionRoutes";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/businesses", businessRoutes);
router.use("/recipes", recipesRoutes);
router.use("/markets", marketsRoutes);
router.use("/restaurants", restaurantRoutes);
router.use("/doctors", doctorsRoutes);
router.use("/professions", professionRoutes);

export default router;
