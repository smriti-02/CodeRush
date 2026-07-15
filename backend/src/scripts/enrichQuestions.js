import fs from 'fs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'leetcode_questions.json');
const OUTPUT_FILE = path.join(__dirname, 'leetcode_enriched.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchLeetCodeData = async (titleSlug) => {
    const query = `
        query questionData($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                codeSnippets { lang langSlug code }
                metaData
                exampleTestcaseList
            }
        }
    `;

    try {
        const response = await axios.post('https://leetcode.com/graphql', {
            query,
            variables: { titleSlug }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10000
        });

        return response.data.data.question;
    } catch (error) {
        console.error(`\n[API Error] for ${titleSlug}: ${error.message}`);
        return null;
    }
};

// NEW: Helper function to grab the slug from the URL or Title
const getTitleSlug = (q) => {
    if (q.titleSlug) return q.titleSlug;
    if (q.url) {
        // e.g., https://leetcode.com/problems/two-sum/ -> two-sum
        const parts = q.url.split('/').filter(Boolean);
        return parts[parts.length - 1]; 
    }
    if (q.title) {
        return q.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    return null;
};

const runScraper = async () => {
    console.log("Reading existing questions...");
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file not found at ${INPUT_FILE}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
    const questions = JSON.parse(rawData);
    
    const enrichedQuestions = [];
    let count = 0;

    console.log(`Found ${questions.length} questions. Starting enrichment process...\n`);

    for (const item of questions) {
        count++;
        const q = item.data?.question;
        
        const titleSlug = q ? getTitleSlug(q) : null;

        if (!q || !titleSlug) {
            console.log(`Skipping ${count}/${questions.length}: No valid slug found.`);
            enrichedQuestions.push(item);
            continue;
        }

        process.stdout.write(`Fetching ${count}/${questions.length}: ${titleSlug}... `);
        
        const extraData = await fetchLeetCodeData(titleSlug);
        
        if (extraData && extraData.codeSnippets) {
            q.codeSnippets = extraData.codeSnippets;
            q.metaData = extraData.metaData;
            q.exampleTestcaseList = extraData.exampleTestcaseList;
            process.stdout.write("✅ Done\n");
        } else {
            process.stdout.write("❌ Failed (Skipped)\n");
        }

        enrichedQuestions.push({ data: { question: q } });

        // Save progress every 20 questions
        if (count % 20 === 0) {
            fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedQuestions, null, 2));
            console.log(`💾 Saved progress at ${count} questions.`);
        }

        await delay(1500); 
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enrichedQuestions, null, 2));
    console.log(`\n🎉 Scraping complete! Enriched data saved to ${OUTPUT_FILE}`);
};

runScraper();