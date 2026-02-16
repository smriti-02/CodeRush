import axios from 'axios';


const JUDGE_URL = process.env.JUDGE0_URL || 'https://ce.judge0.com'; 

export const sendToJudge = async (sourceCode, languageId) => {
    
  const response = await axios.post(
    `${JUDGE_URL}/submissions?base64_encoded=false&wait=true`,
    {
      source_code: sourceCode,
      language_id: languageId,
    }
  );
  
  return response.data;
};