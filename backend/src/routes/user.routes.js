import { Router } from 'express';
import { 
    registerUser, 
    loginUser,
    generateAccessAndRefreshTokens,
    logoutUser,
    refreshAccessToken,
    getUserProfile,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest
} from '../controllers/user.controller.js';
import { verifyJWT }  from '../middlewares/auth.middleware.js';
import passport from 'passport';



const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/logout").post(verifyJWT, logoutUser);
//router.route("/run").post(verifyJWT, runCode);


//Google OAuth
// Trigger for Google Auth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", 
    passport.authenticate("google", { session: false }), 
    async (req, res) => {
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(req.user._id);
        
        const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' };

        res.cookie("accessToken", accessToken, options)
           .cookie("refreshToken", refreshToken, options)
           .redirect(`${process.env.FRONTEND_URL}/dashboard`); // Redirect to your frontend
    }
);

//GitHub OAuth
// Trigger for GitHub Auth
router.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get("/auth/github/callback", 
    passport.authenticate("github", { session: false }), 
    async (req, res) => {
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(req.user._id);
        
        const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' };

        res.cookie("accessToken", accessToken, options)
           .cookie("refreshToken", refreshToken, options)
           .redirect(`${process.env.FRONTEND_URL}/dashboard`); // Redirect to your frontend
    }
);
router.route("/profile").get(verifyJWT, getUserProfile);
router.route("/friend-request").post(verifyJWT, sendFriendRequest);
router.route("/accept-friend").post(verifyJWT, acceptFriendRequest);
router.route("/reject-friend").post(verifyJWT, rejectFriendRequest);

export default router;