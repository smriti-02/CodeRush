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
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", 
    passport.authenticate("google", { session: false }), 
    (req, res) => {
        // Successful authentication, redirect or respond as needed.
    }
);

//GitHub OAuth
router.get("/auth/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get("/auth/github/callback", 
    passport.authenticate("github", { session: false }), 
    (req, res) => {
        // Successful authentication, redirect or respond as needed.
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