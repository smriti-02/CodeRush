import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Helper function to parse cookies from the handshake headers
const getCookieValue = (cookieString, cookieName) => {
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
    return match ? match[2] : null;
};

export const verifySocketJWT = async (socket, next) => {
    try {
        const origin = socket.handshake.headers?.origin;
        const cookieHeader = socket.handshake.headers?.cookie;
        const token = socket.handshake.auth?.token || getCookieValue(cookieHeader, "accessToken");
        
        if (!token) {
            console.warn(`[Socket Auth] Rejected from origin: ${origin}. No accessToken cookie or auth.token found. (Cookie header: ${cookieHeader ? 'present' : 'missing'})`);
            return next(new Error("Unauthorized: No token provided"));
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            console.warn(`[Socket Auth] User not found for decoded token: ${decodedToken?._id}`);
            return next(new Error("Unauthorized: Invalid user"));
        }

        console.log(`[Socket Auth] Authenticated connection for user: ${user.username} (${user._id})`);
        socket.user = user;
        next();
    } catch (error) {
        console.error("[Socket Auth] Error:", error.message);
        return next(new Error("Unauthorized: Token verification failed"));
    }
};