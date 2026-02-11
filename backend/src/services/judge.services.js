import axios from 'axios';


const JUDGE_URL = process.env.JUDGE0_URL || 'http://localhost:2358'; 

export const sendToJudge = async (sourceCode, languageId) => {
    try {
        const response = await axios.post(`${JUDGE_URL}/submissions?wait=true`, {
            source_code: btoa(sourceCode), 
            language_id: languageId,
        });
        return response.data;
    } catch (error) {
        console.error("Judge0 Connection Error:", error.message);
        throw error;
    }
};