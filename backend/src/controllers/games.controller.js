import { asyncHandler } from "../utils/asyncHandler.js";
import { Game } from "../models/game.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { calculateMatchResults } from "../utils/scoring.utlis.js";
import { sendToJudge } from "../services/judge.services.js";

// leaderboard logic
const getLeaderboard = asyncHandler(async (req, res) => {
    const topUsers = await User.find()
        .sort({ elo: -1 }) 
        .limit(50)
        .select("username elo avatar"); 

    return res
        .status(200)
        .json(new ApiResponse(200, topUsers, "Leaderboard fetched successfully"));
});

// process a submission
const processGameResult = asyncHandler(async (req, res) => {
    const { gameId, isWinner, userComplexity, wrongSubmissions } = req.body;

    const game = await Game.findById(gameId).populate("question");
    
    const matchData = {
        isWinner,
        difficulty: game.question.difficulty,
        userComplexity,
        targetComplexity: game.question.targetComplexity,
        wrongSubmissions
    };

    const { netEloChange } = calculateMatchResults(matchData);

    // Update the User's Elo
    await User.findByIdAndUpdate(req.user._id, {
        $inc: { elo: netEloChange }
    });

    // Update Game record
    game.eloChange = netEloChange;
    game.finalComplexity = userComplexity;
    game.attempts = wrongSubmissions;
    game.status = 'COMPLETED';
    await game.save();

    return res
        .status(200)
        .json(new ApiResponse(200, { netEloChange }, "Match results processed"));
});

const runCode = asyncHandler(async (req, res) => {
    const { code, languageId } = req.body;
    const result = await sendToJudge(code, languageId);
    return res.status(200).json(
        new ApiResponse(200, result, "Code executed successfully")
    );
});

export { getLeaderboard, processGameResult, runCode};