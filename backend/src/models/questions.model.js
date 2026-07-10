import mongoose, { Schema } from 'mongoose';

const questionSchema = new Schema({
    frontendId: {
        type: Number, 
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    titleSlug: { 
        type: String,
        required: true,
        unique: true,
        index: true 
    },
    difficulty: { 
        type: String, 
        enum: ['Easy', 'Medium', 'Hard'], 
        required: true,
        index: true 
    },
    content: { 
        type: String,
        required: true 
    },
    categoryTitle: { 
        type: String, 
        default: 'Algorithms' 
    },
    sampleTestCase: { 
        type: String 
    },
    topicTags: [{ 
        name: String, 
        slug: String  
    }],
    companyTags: [{
        name: String,
        slug: String
    }],
    hints: [{ type: String }],  
   
    similarQuestions: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'Question' 
    }],
    stats: {
        totalAccepted: { type: Number, default: 0 },
        totalSubmissions: { type: Number, default: 0 },
        acRate: { type: Number, default: 0 }, 
        likes: { type: Number, default: 0 },
        dislikes: { type: Number, default: 0 }
    },

    // UPDATED: Added driverCode to handle hidden I/O execution
    codeSnippets: [{
        lang: { type: String, required: true },       // e.g., "Python3"
        langSlug: { type: String, required: true },   // e.g., "python3"
        code: { type: String, required: true },       // Starter code shown in editor
        driverCode: { type: String, required: true }  // Hidden wrapper to process stdin/stdout
    }],

    enableRunCode: { type: Boolean, default: true },
    enableSubmit: { type: Boolean, default: true },

    allTestCases: [{
        input: { type: String, required: true },
        output: { type: String, required: true },
        isHidden: { type: Boolean, default: true }
    }],

    performanceTargets: {
        optimalTimeComplexity: { type: String, default: "O(n)" },
        optimalSpaceComplexity: { type: String, default: "O(n)" },
        basePoints: { type: Number, default: 100 } 
    },

    executionLimits: {
        timeout: { type: Number, default: 2000 }, 
        memory: { type: Number, default: 128 }    
    },
},{ timestamps: true });

export const Question = mongoose.model('Question', questionSchema);