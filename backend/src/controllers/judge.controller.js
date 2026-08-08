import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendToJudge } from "../services/judge.services.js";
import { calculateMatchResults } from "../utils/scoring.utils.js";
import { User } from "../models/user.model.js";
import { Question } from "../models/questions.model.js";
import { Game } from "../models/game.model.js";

export const executeCode = asyncHandler(async (req, res) => {
    const { questionId, sourceCode, languageId, langSlug, testCases, sessionId } = req.body;

    if (!questionId || !sourceCode || !languageId || !langSlug || !testCases) {
        throw new ApiError(400, "Missing required execution parameters.");
    }

    // Call the service; pass optional sessionId (e.g., gameId) to allow sandbox reuse
    const result = await sendToJudge(questionId, sourceCode, languageId, langSlug, testCases, sessionId);

    // Judge0 returns a token, or the direct result if wait=true
    return res.status(200).json(
        new ApiResponse(200, result, "Code execution completed.")
    );
});

export const submitCode = asyncHandler(async (req, res) => {
    const { questionId, sourceCode, languageId, langSlug, sessionId, wrongSubmissions = 0, userComplexity = 'O(n^2)' } = req.body;

    if (!questionId || !sourceCode || !languageId || !langSlug) {
        throw new ApiError(400, "Missing required submission parameters.");
    }

    const question = await Question.findById(questionId);
    if (!question) throw new ApiError(404, "Question not found.");

    // Evaluate against ALL hidden testcases
    const result = await sendToJudge(questionId, sourceCode, languageId, langSlug, null, sessionId, true);
    
    // Evaluate ELO if it's a real user session
    let eloData = null;
    let game = null;
    
    if (req.user) {
        if (sessionId) {
            game = await Game.findOne({ roomId: sessionId });
            if (!game && sessionId.match(/^[0-9a-fA-F]{24}$/)) {
                game = await Game.findById(sessionId);
            }
        }

        let isWinner = result.status === "Accepted";
        let finishedSecond = false;
        
        if (isWinner && game && game.status === 'Completed' && game.winner && game.winner.toString() !== req.user._id.toString()) {
            isWinner = false;
            finishedSecond = true;
        }
        
        const matchData = {
            isWinner,
            isDraw: false,
            difficulty: question.difficulty,
            userComplexity: userComplexity,
            targetComplexity: question.performanceTargets?.optimalTimeComplexity || 'O(n)',
            wrongSubmissions: parseInt(wrongSubmissions, 10) || 0
        };

        const matchResults = calculateMatchResults(matchData);
        
        // Update user stats
        const user = await User.findById(req.user._id);
        if (user) {
            user.elo += matchResults.netEloChange;
            user.stats.totalGames += 1;
            if (isWinner) {
                user.stats.wins += 1;
                user.problemsSolved += 1;
            }
            await user.save();

            eloData = {
                netEloChange: matchResults.netEloChange,
                newElo: user.elo,
                complexityMatched: matchResults.complexityMatched,
                penaltyDeducted: matchResults.penaltyDeducted,
                finishedSecond
            };
        }

        if (game) {
                const player = game.players.find(p => p.user.toString() === req.user._id.toString());
                if (player) {
                    player.submissions.push({
                        questionId: questionId,
                        code: sourceCode,
                        language: langSlug,
                        status: result.status
                    });
                    
                    if (isWinner && game.status !== 'Completed') {
                        game.status = 'Completed';
                        game.winner = req.user._id;
                        game.eloChange = matchResults.netEloChange;
                        game.finalComplexity = userComplexity;
                    }
                    await game.save();
                }
            }
    }

    return res.status(200).json(
        new ApiResponse(200, { result, eloData }, "Code submission completed.")
    );
});