import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
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
    avatar:{
        type: String,
        default: 'default-avatar.png'
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

    refreshToken:{
        type: String,
    }

    
},
{
    timestamps: true,
});

export const User = mongoose.model('User', userSchema);