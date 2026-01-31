import { Router } from 'express';
import { 
    registerUser, 
    loginUser,
    generateAccessAndRefreshTokens,
    logoutUser,
    refreshAccessToken
} from '../controllers/user.controller.js';
import { verifyJWT }  from '../middlewares/auth.middleware.js';
import passport from 'passport';


const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logoutUser);

//Google OAuth
router.get("/auth/google/callback", 
    passport.authenticate("google", { session: false }), 
    async (req, res) => {
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(req.user._id);
        
        const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };

        res.cookie("accessToken", accessToken, options)
           .cookie("refreshToken", refreshToken, options)
           .redirect(`${process.env.FRONTEND_URL}/dashboard`); // Redirect to your frontend
    }
);

//GitHub OAuth
router.get("/auth/github/callback", 
    passport.authenticate("github", { session: false }), 
    async (req, res) => {
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(req.user._id);
        
        const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };

        res.cookie("accessToken", accessToken, options)
           .cookie("refreshToken", refreshToken, options)
           .redirect(`${process.env.FRONTEND_URL}/dashboard`); // Redirect to your frontend
    }
);
router.route("/profile").get(verifyJWT, async (req, res) => {
    return res.status(200).json({
        status: 200,
        data: req.user,
        message: "User profile fetched successfully."
    });
});


export default router;