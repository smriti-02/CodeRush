import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
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
    password: {
        type: String,
        required: function() { return !this.googleId && !this.githubId; } // This means password is required if neither googleId nor githubId is provided
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

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            googleId: this.googleId || null,
            githubId: this.githubId || null,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
}

export const User = mongoose.model('User', userSchema);