import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { createSessionClient } from '../utils/appwrite.js';

import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        
        if (!user) {
            throw new ApiError(404, "User not found for token generation");
        }
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
    }

}

const registerUser = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    if ([username, email, password].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
        throw new ApiError(409, "User with given email or username already exists");
    }
    const { account } = createSessionClient();
    const appwriteUser = await account.create('unique()', email, password, username);

    if (!appwriteUser) {
        throw new ApiError(500, "Error creating user in Appwrite");
    }

    const user = await User.create({
        appwriteId: appwriteUser.$id,
        email,
        username,
        avatar: 'default-avatar.png'
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user in MongoDB");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { account } = createSessionClient();

    try {
        // 1. Create session in Appwrite
        const session = await account.createEmailPasswordSession(email, password);
        
        // 2. IMPORTANT: Find user in MongoDB using session.userId (AppwriteId)
        // Do NOT call account.get() as it often fails with "missing scope (account)" on servers
        const user = await User.findOne({ appwriteId: session.userId });

        if (!user) {
            throw new ApiError(404, "User does not exist in MongoDB");
        }

        // 3. Generate tokens (Ensure .env is configured correctly!)
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, user, "User logged in successfully"));
            
    } catch (err) {
        throw new ApiError(500, err.message || "Login failed at server");
    }
});

const socialLoginHandler = asyncHandler(async (req, res) => {
    const { 
        $id: appwriteId, 
        email, 
        name 
    } = req.appwriteUser;


    if (!appwriteId || !email) {
        throw new ApiError(400, "Missing required data from social provider.");
    }

    let user = await User.findOne({ 
        $or: [{ appwriteId }, { email }] 
    });

    let isNewUser = !user;

    if (isNewUser) {
        let baseUsername = name?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || email.split('@')[0];
        let username = baseUsername;
        let counter = 1;

        let userWithSameUsername = await User.findOne({ username });
        while (userWithSameUsername) {
            username = `${baseUsername}${counter++}`;
            userWithSameUsername = await User.findOne({ username });
        }

        user = await User.create({
            appwriteId,
            email,
            username, 
        });

        if (!user) {
            throw new ApiError(500, "Error creating user in MongoDB after social login.");
        }
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' 
    }

    const userData = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(isNewUser ? 201 : 200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(isNewUser ? 201 : 200, userData, isNewUser ? "Social user registered & logged in" : "User logged in successfully")
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {new: true}
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshtoken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token missing. Unauthorized access.");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );;

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(404, "User not found. Unauthorized access.");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token was used or revoked. Please log in again.");
        }

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
        }
        const userData = user.toObject();
        delete userData.password;
        delete userData.refreshToken;

        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, userData, "Access token refreshed successfully."));
        } catch (error) {
        throw new ApiError(401, error?.message || "Invalid or expired refresh token. Unauthorized access.");
    }
    
});

export { 
    registerUser, 
    socialLoginHandler,
    loginUser,
    generateAccessAndRefreshTokens,
    logoutUser,
    refreshAccessToken
};