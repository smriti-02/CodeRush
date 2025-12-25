import { Router } from 'express';
import { 
    registerUser, 
    socialLoginHandler,
    loginUser,
    generateAccessAndRefreshTokens,
    logoutUser,
    refreshAccessToken
} from '../controllers/user.controller.js';
import { verifyJWT }  from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/social-login-callback").post(socialLoginHandler); 
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logoutUser);

router.route("/profile").get(verifyJWT, async (req, res) => {
    return res.status(200).json({
        status: 200,
        data: req.user,
        message: "User profile fetched successfully."
    });
});


export default router;