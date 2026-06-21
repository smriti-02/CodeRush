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
        const token = socket.handshake.auth?.token || getCookieValue(socket.handshake.headers?.cookie, "accessToken");
        
        if (!token) {
            return next(new Error("Unauthorized: No token provided"));
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            return next(new Error("Unauthorized: Invalid user"));
        }

        socket.user = user;
        next();
    } catch (error) {
        console.error("Socket Auth Error:", error.message);
        return next(new Error("Unauthorized: Token verification failed"));
    }
};