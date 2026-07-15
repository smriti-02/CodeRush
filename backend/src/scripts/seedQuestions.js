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

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("✅ MongoDB Connected");
        console.log("DB Instance: ", connectionInstance.connection.host);
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
            console.error(`❌ Data file not found at ${filePath}.`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(filePath, 'utf-8');
        const githubQuestions = JSON.parse(rawData);

        console.log(`Found ${githubQuestions.length} raw questions in JSON. Formatting and filtering...`);

        const formattedQuestions = githubQuestions.map((item, index) => {
            const q = item.data?.question;
            
            // STRICT FILTER: If it failed scraping or is a locked premium question, drop it entirely.
            if (!q || !q.metaData || !q.codeSnippets || q.codeSnippets.length === 0) {
                return null; 
            }

            return {
                frontendId: q.questionFrontendId || (index + 1),
                title: q.title || `Question ${index + 1}`,
                titleSlug: q.titleSlug || (q.title ? q.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `question-${index + 1}`),
                difficulty: q.difficulty || 'Easy',
                content: q.content || "Problem description goes here.",
                categoryTitle: q.categoryTitle || 'Algorithms',
                sampleTestCase: q.exampleTestcaseList && q.exampleTestcaseList.length > 0 ? q.exampleTestcaseList[0] : "",
                
                topicTags: (q.topicTags || []).map(t => ({
                    name: t.name || t, 
                    slug: t.name ? t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'tag'
                })),

                metaData: q.metaData,
                
                codeSnippets: q.codeSnippets.map(snippet => ({
                    lang: snippet.lang,
                    langSlug: snippet.langSlug,
                    code: snippet.code,
                    driverCode: `// Driver code for ${snippet.langSlug} will be generated at runtime` 
                })),

                allTestCases: (q.exampleTestcaseList || []).map((inputStr, i) => ({
                    input: inputStr,
                    output: "TODO_PARSE_EXPECTED_OUTPUT", // Placeholder to satisfy schema; will require executing against a known good solution later
                    isHidden: i > 1 
                }))
            };
        }).filter(q => q !== null);

        console.log(`✅ Kept ${formattedQuestions.length} valid, execution-ready questions.`);

        await Question.deleteMany();
        console.log("🗑️  Cleared existing questions collection.");

        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < formattedQuestions.length; i += batchSize) {
            const batch = formattedQuestions.slice(i, i + batchSize);
            await Question.insertMany(batch);
            insertedCount += batch.length;
            console.log(`⏳ Inserted ${insertedCount} / ${formattedQuestions.length} questions...`);
        }

        console.log(`🎉 Successfully seeded ${insertedCount} questions!`);
        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
};

seedData();