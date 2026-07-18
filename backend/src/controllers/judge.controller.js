import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendToJudge } from "../services/judge.services.js";

export const executeCode = asyncHandler(async (req, res) => {
    const { questionId, sourceCode, languageId, langSlug, testCases } = req.body;

    if (!questionId || !sourceCode || !languageId || !langSlug || !testCases) {
        throw new ApiError(400, "Missing required execution parameters.");
    }

    // Call the service we updated earlier
    const result = await sendToJudge(questionId, sourceCode, languageId, langSlug, testCases);

    // Judge0 returns a token, or the direct result if wait=true
    return res.status(200).json(
        new ApiResponse(200, result, "Code execution completed.")
    );
});