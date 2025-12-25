import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
    try{
        const accessToken = req.cookies?.accessToken || req.header("Authroization")?.replace("Bearer ", "");
        if (!accessToken) {
            throw new ApiError(401, "Access token missing. Unauthorized access.");
        }

        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(404, "User not found. Unauthorized access.");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid or expired access token. Unauthorized access.");
    }
});

export { verifyJWT };