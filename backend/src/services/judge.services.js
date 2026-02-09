import axios from 'axios';

// The URL where Judge0 will be running inside Docker
const JUDGE0_URL = 'http://localhost:2358';

export const submitCodeToJudge = async (code, languageId, stdin) => {
    try {
        // 1. Send the code to Judge0
        const response = await axios.post(`${JUDGE0_URL}/submissions?wait=true`, {
            source_code: btoa(code), 
            language_id: languageId,
            stdin: btoa(stdin || ""),
        });

        // 2. Return the result
        return response.data;
    } catch (error) {
        console.error("Judge0 Error:", error.message);
        throw error;
    }
};