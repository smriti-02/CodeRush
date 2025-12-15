import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js'; 
import { ApiError } from '../utils/ApiError.js';     
import { ApiResponse } from '../utils/ApiResponse.js';

const socialLoginHandler = asyncHandler(async (req, res) => {
    const { 
        $id: appwriteId, 
        email, 
        name 
    } = req.appwriteUser;

    if (!appwriteId || !email) {
        throw new ApiError(400, "Appwrite ID and email are missing. Cannot process social login.");
    }

    let user = await User.findOne({ 
        $or: [{ appwriteId }, { email }] 
    });

    if (user) {
        await user.save({ validateBeforeSave: false });

        return res.status(200).json(new ApiResponse(200, user, "User logged in successfully."));
    }

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
        avatar: user.avatar || 'default-avatar.png'
    });

    if (!user) {
        throw new ApiError(500, "Error creating user in MongoDB after successful Appwrite authentication.");
    }

    return res.status(201).json(new ApiResponse(201, user, "User registered and logged in successfully."));
});