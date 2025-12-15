import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { createSessionClient } from '../utils/appwrite.js';

const generateAccessAndRefreshTokens = async(userId) => {
    return { accessToken: 'dummyAccessToken', refreshToken: 'dummyRefreshToken' }
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

export const socialLoginHandler = asyncHandler(async (req, res) => {
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

export { 
    registerUser, 
    socialLoginHandler 
};