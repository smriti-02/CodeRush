import axios from 'axios';
import { Question } from '../models/questions.model.js';
import { stitchCode } from '../utils/codeStitcher.js';

const JUDGE_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com'; 

export const sendToJudge = async (questionId, userCode, languageId, langSlug) => {
    try {
        // 1. Fetch the question to get metadata and test cases
        const question = await Question.findById(questionId);
        if (!question) {
            throw new Error("Question not found in database.");
        }

        // 2. Stitch the user's snippet into a full executable file
        const stitchedCode = stitchCode(userCode, langSlug, question.metaData);

        // 3. Grab the first test case for a standard "Run" execution
        // (For a full "Submit", you would loop through allTestCases)
        const testCase = question.allTestCases[0]; 
        const stdin = testCase ? testCase.input : "";
        const expectedOutput = testCase ? testCase.output : "";

        // 4. Send the stitched code AND the inputs to Judge0
        const response = await axios.post(
            `${JUDGE_URL}/submissions?base64_encoded=false&wait=true`,
            {
                source_code: stitchedCode,
                language_id: languageId,
                stdin: stdin,
                expected_output: expectedOutput
            }
        );
        
        return response.data;
    } catch (error) {
        console.error("Judge0 API Error:", error.response?.data || error.message);
        throw error;
    }
};import axios from 'axios';
import { Question } from '../models/questions.model.js';
import { stitchCode } from '../utils/codeStitcher.js';

const JUDGE_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com'; 

export const sendToJudge = async (questionId, userCode, languageId, langSlug) => {
    try {
        // 1. Fetch the question to get metadata and test cases
        const question = await Question.findById(questionId);
        if (!question) {
            throw new Error("Question not found in database.");
        }

        // 2. Stitch the user's snippet into a full executable file
        const stitchedCode = stitchCode(userCode, langSlug, question.metaData);

        // 3. Grab the first test case for a standard "Run" execution
        // (For a full "Submit", you would loop through allTestCases)
        const testCase = question.allTestCases[0]; 
        const stdin = testCase ? testCase.input : "";
        const expectedOutput = testCase ? testCase.output : "";

        // 4. Send the stitched code AND the inputs to Judge0
        const response = await axios.post(
            `${JUDGE_URL}/submissions?base64_encoded=false&wait=true`,
            {
                source_code: stitchedCode,
                language_id: languageId,
                stdin: stdin,
                expected_output: expectedOutput
            }
        );
        
        return response.data;
    } catch (error) {
        console.error("Judge0 API Error:", error.response?.data || error.message);
        throw error;
    }
};