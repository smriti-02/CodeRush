import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Question } from '../models/questions.model.js';
import { DB_NAME } from "../constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const unescapeHTML = (str) => {
    return str
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
};

const extractAndPatch = async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("✅ MongoDB Connected");

        const questions = await Question.find({});
        let patchedCount = 0;

        for (const q of questions) {
            if (!q.content || !q.allTestCases || q.allTestCases.length === 0) continue;

            // Regex to find "Output:</strong> " and capture everything until a newline or HTML tag
            const regex = /Output:<\/strong>\s*(?:<code>)?(.*?)(?:<\/code>|\n|<)/g;
            let match;
            const extractedOutputs = [];

            while ((match = regex.exec(q.content)) !== null) {
                extractedOutputs.push(unescapeHTML(match[1]));
            }

            // If we found the same number of outputs as inputs, patch them in
            if (extractedOutputs.length > 0) {
                let updated = false;
                
                for (let i = 0; i < q.allTestCases.length; i++) {
                    if (extractedOutputs[i]) {
                        q.allTestCases[i].output = extractedOutputs[i];
                        updated = true;
                    }
                }

                if (updated) {
                    await q.save();
                    patchedCount++;
                }
            }
        }

        console.log(`\n🎉 Successfully extracted and patched outputs for ${patchedCount} questions!`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Extraction failed:", error);
        process.exit(1);
    }
};

extractAndPatch();