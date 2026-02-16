import { Router } from "express";
import { getLeaderboard, processGameResult, runCode} from "../controllers/games.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/leaderboard").get(getLeaderboard);
router.route("/process-result").post(verifyJWT, processGameResult);
router.route("/run").post(verifyJWT, runCode);

export default router;