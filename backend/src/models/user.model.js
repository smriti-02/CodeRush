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

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            appwriteId: this.appwriteId // Or any other relevant info
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