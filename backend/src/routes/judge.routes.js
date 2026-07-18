import { Router } from "express";
import { executeCode } from "../controllers/judge.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"; // Assuming you want this protected

const router = Router();

// router.use(verifyJWT); // Secure the route
router.post("/run", executeCode);

export default router;