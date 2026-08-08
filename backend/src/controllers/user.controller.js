import { User } from '../models/user.model.js';
import { Game } from '../models/game.model.js';
import { asyncHandler } from '../utils/asyncHandler.js'; 
import { ApiError } from '../utils/ApiError.js';     
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import { sendToJudge } from "../services/judge.services.js";

export const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

export const registerUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if ([email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    const user = await User.create({ email, username, password });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

export const logoutUser = asyncHandler(async (req, res) => {
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

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token missing. Unauthorized access.");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

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

export const getUserProfile = asyncHandler(async (req, res) => {
    const targetUsername = req.query.username;
    
    let user;
    if (targetUsername) {
        // Fetch public profile for another user
        user = await User.findOne({ username: new RegExp('^' + targetUsername + '$', 'i') })
            .populate('friends', 'username avatar elo status')
            .select("-password -refreshToken -friendRequests");
            
        if (!user) {
            throw new ApiError(404, "User not found");
        }
    } else {
        // Fetch current user's profile
        user = await User.findById(req.user._id)
            .populate('friends', 'username avatar elo status')
            .populate('friendRequests', 'username avatar elo')
            .select("-password -refreshToken");
    }

    // Fetch games for this user directly from Game collection
    const games = await Game.find({ 'players.user': user._id })
        .populate('players.user', 'username avatar elo')
        .populate('questions', 'title')
        .sort({ createdAt: -1 });

    const userObj = user.toObject();
    userObj.gameHistory = games;

    return res.status(200).json(new ApiResponse(200, userObj, "User profile fetched successfully"));
});

export const sendFriendRequest = asyncHandler(async (req, res) => {
    const { friendUsername } = req.body;
    
    if (!friendUsername) {
        throw new ApiError(400, "Friend username is required");
    }

    if (friendUsername.toLowerCase() === req.user.username.toLowerCase()) {
        throw new ApiError(400, "You cannot send a friend request to yourself");
    }

    const friend = await User.findOne({ username: new RegExp('^' + friendUsername + '$', 'i') });
    
    if (!friend) {
        throw new ApiError(404, "User not found");
    }

    const currentUser = await User.findById(req.user._id);
    
    if (currentUser.friends.includes(friend._id)) {
        throw new ApiError(400, "User is already your friend");
    }

    if (friend.friendRequests.includes(currentUser._id)) {
        throw new ApiError(400, "Friend request already sent");
    }
    
    if (currentUser.friendRequests.includes(friend._id)) {
         throw new ApiError(400, "This user has already sent you a request. Check your pending requests.");
    }

    friend.friendRequests.push(currentUser._id);
    await friend.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Friend request sent successfully"));
});

export const acceptFriendRequest = asyncHandler(async (req, res) => {
    const { requesterId } = req.body;
    
    if (!requesterId) throw new ApiError(400, "Requester ID is required");

    const currentUser = await User.findById(req.user._id);
    const requester = await User.findById(requesterId);

    if (!requester) throw new ApiError(404, "Requester not found");

    // Remove from friendRequests
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    
    // Add to friends for both
    if (!currentUser.friends.includes(requesterId)) {
        currentUser.friends.push(requesterId);
    }
    if (!requester.friends.includes(currentUser._id)) {
        requester.friends.push(currentUser._id);
    }

    await currentUser.save({ validateBeforeSave: false });
    await requester.save({ validateBeforeSave: false });

    const addedFriend = await User.findById(requesterId).select("username avatar elo status");

    return res.status(200).json(new ApiResponse(200, addedFriend, "Friend request accepted"));
});

export const rejectFriendRequest = asyncHandler(async (req, res) => {
    const { requesterId } = req.body;
    
    if (!requesterId) throw new ApiError(400, "Requester ID is required");

    const currentUser = await User.findById(req.user._id);

    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    await currentUser.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Friend request rejected"));
});
