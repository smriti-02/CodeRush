import mongoose, {Schema} from 'mongoose';

const questionSchema = new Schema({
    frontendId:{
        type: Number, 
        required: true,
        unique: true,
        index: true
    },

    title:{
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
    default: 'Algorithms' // Algorithms, Database, Shell, Concurrency
    },

    sampleTestCase: { 
        type: String 
    },

    topicTags: [{ 
    name: String, // e.g., "Array"
    slug: String  // e.g., "array"
    }],

    companyTags: [{
    name: String,
    slug: String
    }],

    hints: [{ type: String }],  // Array of hint strings
   
    similarQuestions: [{ 
        type: Schema.Types.ObjectId, 
        ref: 'Question' 
    }],

    stats: {
    totalAccepted: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    acRate: { type: Number, default: 0 }, // Calculated percentage
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 }
    },

    codeSnippets: [{
    lang: { type: String, required: true }, // e.g., "C++", "Java", "Python3"
    langSlug: { type: String, required: true }, // e.g., "cpp", "java", "python3"
    code: { type: String, required: true } // The actual template code
    }],

    enableRunCode: { type: Boolean, default: true },
    enableSubmit: { type: Boolean, default: true }
    
},{ timestamps: true });

export const Question = mongoose.model('Question', questionSchema);