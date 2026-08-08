import { Router } from "express";
import { getAccountAnalysis, getGameReview } from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/account-analysis").get(verifyJWT, getAccountAnalysis);
router.route("/game-review/:gameId").get(verifyJWT, getGameReview);

export default router;
