import mongoose, {Schema} from 'mongoose';

const gameSchema = new Schema({
    players:[{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        socketId:{
            type: String,
            required: true,
        },
        status:{
            type: String,
            enum: ['connected', 'disconnected', 'left'],
            default: 'connected',
        },
        submmissions:[{
            questionId:{
                type: Schema.Types.ObjectId,
                ref: 'Question',
            }
        }]
    }],
    roomId:{
        type: String,
        required: true,
        unique: true,
        index: true
    },
    qustions:[{
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
    }
    
},
{timestamps: true});

export const Game = mongoose.model('Game', gameSchema);