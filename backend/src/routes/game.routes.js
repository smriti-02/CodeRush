import { Router } from "express";
import { getLeaderboard,  runCode, getGameDetails, findMatch } from "../controllers/games.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/leaderboard").get(getLeaderboard);
router.route("/run-code").post(verifyJWT, runCode);
router.route("/find-match").post(verifyJWT, findMatch);
router.route("/:gameId").get(verifyJWT, getGameDetails);

export default router;