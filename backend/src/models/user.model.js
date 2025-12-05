import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
    appwriteId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username:{
        unique: true,
        required: true,
        type: String,
        trim: true,
        index: true
    },
    email:{
        unique: true,
        required: true,
        type: String,
        trim: true,
    },
    elo:{
        type: Number,
        default: 0,
    },
    avatar:{
        type: String,
        default: 'default-avatar.png'
    },
    stats: {
        wins: { type: Number, default: 0 },
        totalGames: { type: Number, default: 0 }
    },
    password:{
        required: [true, 'Password is required'],
        type: String,
    },
    gameHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Game'
    }],
    friends:[{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    status:{
        type: String,
        enum: ['online', 'offline', 'busy', 'away'],
        default: 'offline'
    },
    problemsSolved:{
        type: Number,
        default: 0,
    },
    refreshToken:{
        type: String,
    }

    
},
{
    timestamps: true,
});

export const User = mongoose.model('User', userSchema);