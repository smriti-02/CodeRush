import { Router } from "express";
import { getAccountAnalysis, getGameReview, askChatbot } from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Limit to 10 AI requests per 15 minutes per IP to prevent API abuse
const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10,
    message: { success: false, message: "Too many AI requests. Please wait a few minutes before trying again." }
});

router.route("/account-analysis").get(verifyJWT, aiRateLimiter, getAccountAnalysis);
router.route("/game-review/:gameId").get(verifyJWT, aiRateLimiter, getGameReview);
router.route("/chat").post(verifyJWT, aiRateLimiter, askChatbot);

export default router;
