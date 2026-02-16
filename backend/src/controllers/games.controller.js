import { asyncHandler } from "../utils/asyncHandler.js";
import { Game } from "../models/game.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { sendToJudge } from "../services/judge.services.js";
import { calculateMatchResults } from "../utils/scoring.utils.js";
import { io } from "../index.js";

//runCode and GameResults
export const runCode = asyncHandler(async (req, res) => {
    const { code, languageId, gameId, complexity } = req.body;

    if (!code || !languageId) {
        throw new ApiError(400, "Code and Language ID are required");
    }
    const result = await sendToJudge(code, languageId);

    if (gameId && result.status?.id === 3) {
        const game = await Game.findById(gameId).populate("question");
        
        if (!game) throw new ApiError(404, "Game record not found");

        const matchData = {
            isWinner: true, //will be used for future multiplayer mode
            difficulty: game.question.difficulty,
            userComplexity: complexity,
            targetComplexity: game.question.targetComplexity,
            wrongSubmissions: req.body.wrongSubmissions || 0
        };

        // 3. Calculate ELO change based on match results
        const { netEloChange } = calculateMatchResults(matchData);

        // 4. Update Database
        await User.findByIdAndUpdate(req.user._id, { $inc: { elo: netEloChange } });
        
        game.eloChange = netEloChange;
        game.finalComplexity = complexity;
        game.status = 'COMPLETED';
        await game.save();

        return res.status(200).json(
            new ApiResponse(200, { result, eloChange: netEloChange }, "Code executed and score updated")
        );
    }

    // For Code Runs without Game Context
    return res.status(200).json(
        new ApiResponse(200, result, "Code executed successfully")
    );
});

export const getLeaderboard = asyncHandler(async (req, res) => {
    const topUsers = await User.find()
        .sort({ elo: -1 })
        .limit(50)
        .select("username elo avatar");

    return res.status(200).json(
        new ApiResponse(200, topUsers, "Leaderboard fetched successfully")
    );
});

let matchQueue = []; // Simple in-memory queue for matchmaking

export const findMatch = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    if (matchQueue.length > 0) {
        const opponentId = matchQueue.shift();
        const randomQuestion = await Question.aggregate([{ $sample: { size: 1 } }]);
        
        const newGame = await Game.create({
            players: [userId, opponentId],
            question: randomQuestion[0]._id,
            status: 'PENDING'
        });

        // Emit real-time event to players
        io.emit(`matchFound:${userId}`, { gameId: newGame._id });
        io.emit(`matchFound:${opponentId}`, { gameId: newGame._id });

        return res.status(201).json(new ApiResponse(201, { gameId: newGame._id }, "Match found!"));
    } else {
        matchQueue.push(userId.toString());
        return res.status(200).json(new ApiResponse(200, null, "Waiting for opponent..."));
    }
});

export const getGameDetails = asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    
    // Populate the question to get the targetComplexity
    const game = await Game.findById(gameId).populate("question");

    if (!game) {
        throw new ApiError(404, "Game not found");
    }

    return res.status(200).json(
        new ApiResponse(200, game, "Game details fetched successfully")
    );
});