import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Question } from '../models/questions.model.js'; 
import { DB_NAME } from "../constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const generateDriverCode = (langSlug) => {
    switch (langSlug) {
        case 'javascript':
            return `const fs = require('fs');\n\n{{USER_CODE_HERE}}\n\nconst input = fs.readFileSync('/dev/stdin', 'utf-8').trim().split('\\n');\nconsole.log("Executed");`;
        case 'python3':
        case 'python':
            return `import sys\nimport json\n\n{{USER_CODE_HERE}}\n\nif __name__ == '__main__':\n    print("Executed")`;
        case 'cpp':
            return `#include <iostream>\n#include <vector>\nusing namespace std;\n\n{{USER_CODE_HERE}}\n\nint main() {\n    cout << "Executed" << endl;\n    return 0;\n}`;
        case 'java':
            return `import java.util.*;\nimport java.io.*;\n\n{{USER_CODE_HERE}}\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Executed");\n    }\n}`;
        default:
            return `{{USER_CODE_HERE}}`;
    }
};

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("✅ MongoDB Connected");
        console.log("\n Connected to MongoDB successfully || DB Instance: ", connectionInstance.connection.host);
    } catch (error) {
        console.error("❌ Connection error:", error);
        process.exit(1);
    }
};

const seedData = async () => {
    try {
        await connectDB();
        
        const filePath = path.join(__dirname, 'leetcode_questions.json');
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Data file not found at ${filePath}. Please add your JSON file.`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(filePath, 'utf-8');
        const githubQuestions = JSON.parse(rawData);

        console.log(`Found ${githubQuestions.length} questions in JSON. Formatting...`);

        const formattedQuestions = githubQuestions.map((item, index) => {
            // FIX: Access the nested 'data.question' object
            const q = item.data?.question;
            
            if (!q) return null; // Skip invalid entries

            return {
                frontendId: q.questionFrontendId || (index + 1),
                title: q.title || `Question ${index + 1}`,
                titleSlug: q.title ? q.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `question-${index + 1}`,
                difficulty: q.difficulty || 'Easy',
                content: q.content || "Problem description goes here.",
                categoryTitle: q.categoryTitle || 'Algorithms',
                sampleTestCase: "1\n2", // Fallback, not in your JSON
                
                topicTags: (q.topicTags || []).map(t => ({
                    name: t.name || t, 
                    slug: t.name ? t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'tag'
                })),
                
                // Fallback since your JSON doesn't contain codeSnippets
                codeSnippets: (q.codeSnippets || [
                    { lang: 'JavaScript', langSlug: 'javascript', code: 'function solve() {\n\n}' },
                    { lang: 'Python3', langSlug: 'python3', code: 'def solve():\n    pass' }
                ]).map(snippet => ({
                    lang: snippet.lang,
                    langSlug: snippet.langSlug,
                    code: snippet.code,
                    driverCode: generateDriverCode(snippet.langSlug) 
                })),

                // Fallback since your JSON doesn't contain testCases
                allTestCases: [
                    { input: "1", output: "1", isHidden: false }
                ]
            };
        }).filter(q => q !== null);

        await Question.deleteMany();
        console.log("🗑️  Cleared existing questions.");

        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < formattedQuestions.length; i += batchSize) {
            const batch = formattedQuestions.slice(i, i + batchSize);
            await Question.insertMany(batch);
            insertedCount += batch.length;
            console.log(`⏳ Inserted ${insertedCount} / ${formattedQuestions.length} questions...`);
        }

        console.log(`🎉 Successfully seeded all ${insertedCount} questions!`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
};

seedData();