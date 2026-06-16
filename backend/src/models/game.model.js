import mongoose, {Schema} from 'mongoose';

const gameSchema = new Schema({
    players: [{
        user: { 
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        socketId: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['connected', 'disconnected', 'left'],
            default: 'connected',
        },
        submissions: [{
            questionId: {
                type: Schema.Types.ObjectId,
                ref: 'Question',
            }
        }]
    }],
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Abandoned'],
        default: 'Pending'
    },
    roomId:{
        type: String,
        required: true,
        unique: true,
        index: true
    },
    questions:[{
        type: Schema.Types.ObjectId,
        ref: 'Question',
        required: true
    }],
    winner:{
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    settings:{
        duration:{
            type: Number,
            default: 10, // in minutes
        },
        mode:{
            type: String,
            enum: ['classic', 'Ranked', 'Marathon'],
            default: 'classic',
        }
    },
    eloChange: {
        type: Number,
        default: 0
    },
    finalComplexity: {
        type: String,
        enum: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)','O(n^3)', 'O(2^n)', 'O(n!)'],
    },
    attempts: {
        type: Number,
        default: 0
    },
    
},
{timestamps: true});

export const Game = mongoose.model('Game', gameSchema);