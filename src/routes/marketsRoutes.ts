import express from "express";
import { protect } from "../middleware/authMiddleware";
import {
	getMarkets,
	getMarketById,
	createMarket,
	updateMarket,
	addReviewToMarket,
	deleteMarket,
} from "../controllers/marketsControllers";

const router = express.Router();

router.get("/", getMarkets);
router.get("/:id", getMarketById);
router.post("/create", protect, createMarket);
router.post("/add-review/:id", protect, addReviewToMarket);
router.put("/update/:id", protect, updateMarket);
router.delete("/delete/:id", protect, deleteMarket);

export default router;
