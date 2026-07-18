import { asyncHandler } from "../utils/asyncHandler.js";
import { Game } from "../models/game.model.js";
import { User } from "../models/user.model.js";
import { Question } from "../models/questions.model.js"; // Step 1: Imported Question model
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { sendToJudge } from "../services/judge.services.js";
import { calculateMatchResults } from "../utils/scoring.utils.js";
import { io } from "../index.js";
import crypto from "crypto"; // Used to generate unique roomId


export const getArenaData = asyncHandler(async (req, res) => {
    // 1. Foolproof extraction: Grabs the ID from the URL regardless of the parameter name in game.routes.js
    const urlId = Object.values(req.params)[0];

    if (!urlId) {
        throw new ApiError(400, "No ID provided in the URL");
    }

    // 2. Fetch the game using the clean ID
    const game = await Game.findOne({ roomId: urlId }).populate('questions');

    if (!game) {
        throw new ApiError(404, `Match not found for ID: ${urlId}`);
    }

    const question = game.questions[0]; // Active question

    return res.status(200).json(
        new ApiResponse(200, {
           
            gameStatus: game.status,
            settings: game.settings,
            question: {
                _id: question._id,
                title: question.title,
                difficulty: question.difficulty,
                content: question.content,
                // Only send the starter code to the frontend!
                codeSnippets: question.codeSnippets?.map(s => ({
                    lang: s.lang,
                    langSlug: s.langSlug,
                    code: s.code
                })) || [],
                sampleTestCase: question.sampleTestCase,
                topicTags: question.topicTags
            }
        }, "Arena data fetched successfully")
    );
});

// runCode and GameResults
export const runCode = asyncHandler(async (req, res) => {
    const { code, languageId, gameId, complexity } = req.body;

    if (!code || !languageId) {
        throw new ApiError(400, "Code and Language ID are required");
    }
    const result = await sendToJudge(code, languageId);

    if (gameId && result.status?.id === 3) {
        // Updated population to match plural 'questions' field
        const game = await Game.findOne({ roomId: gameId }).populate("questions");
        
        if (!game || !game.questions || game.questions.length === 0) {
            throw new ApiError(404, "Game or associated question record not found");
        }

        const activeQuestion = game.questions[0];

        const matchData = {
            isWinner: true, 
            difficulty: activeQuestion.difficulty,
            userComplexity: complexity,
            targetComplexity: activeQuestion.performanceTargets?.optimalTimeComplexity || "O(n)",
            wrongSubmissions: req.body.wrongSubmissions || 0
        };

        // Calculate ELO change based on match results
        const { netEloChange } = calculateMatchResults(matchData);

        // Update Database
        await User.findByIdAndUpdate(req.user._id, { $inc: { elo: netEloChange } });
        
        game.eloChange = netEloChange;
        game.finalComplexity = complexity;
        game.status = 'Completed'; // Step 3: Capitalized to match schema string validation enum ['Pending', 'Completed', 'Abandoned']
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
    // Expecting optional tags (array of strings/slugs) and difficulty from the request body or query params
    // Example payload: { tags: ["array", "dynamic-programming"], difficulty: "Medium" }
    const { tags, difficulty } = req.body;

    if (matchQueue.length > 0) {
        const opponentId = matchQueue.shift();

        // Build the dynamic match filter criteria
        // 1. Initialize criteria forcing the presence of sample test cases
        const matchCriteria = {
            sampleTestCase: { $exists: true, $type: 'array', $ne: [] },
            sampleOutputs: { $exists: true, $type: 'array', $ne: [] }
        };

        if (difficulty) {
            matchCriteria.difficulty = difficulty;
        }

        if (tags && Array.isArray(tags) && tags.length > 0) {
            matchCriteria["topicTags.slug"] = { $in: tags };
        }

        let randomQuestion = await Question.aggregate([
            { $match: matchCriteria },
            { $sample: { size: 1 } }
        ]);

        // 2. Fix the fallback to ALSO strictly require test cases
        if (!randomQuestion || randomQuestion.length === 0) {
            randomQuestion = await Question.aggregate([
                { 
                    $match: { 
                        sampleTestCase: { $exists: true, $type: 'array', $ne: [] } 
                    } 
                },
                { $sample: { size: 1 } }
            ]);
        }
        
        if (!randomQuestion || randomQuestion.length === 0) {
            randomQuestion = await Question.aggregate([
                {
                    $match: {
                        sampleTestCase: { $exists: true, $type: 'array', $ne: [] } 
                    }
                },
                { $sample: { size: 1 } }
            ]);
        }

        const generatedRoomId = crypto.randomBytes(8).toString("hex");

        const newGame = await Game.create({
            players: [
                {
                    user: userId, // Maps to the fixed schema field
                    socketId: `socket_${userId}`, 
                    status: 'connected'
                },
                {
                    user: opponentId, // Maps to the fixed schema field
                    socketId: `socket_${opponentId}`, 
                    status: 'connected'
                }
            ],
            questions: [randomQuestion[0]._id],
            roomId: generatedRoomId,
            status: 'Pending'
        });
        // Emit real-time event to players
        io.emit(`matchFound:${userId}`, { gameId: newGame.roomId });
        io.emit(`matchFound:${opponentId}`, { gameId: newGame.roomId });

        return res.status(201).json(new ApiResponse(201, { gameId: newGame.roomId }, "Match found!"));

        return res.status(201).json(new ApiResponse(201, { gameId: newGame._id }, "Match found!"));
    } else {
        matchQueue.push(userId.toString());
        return res.status(200).json(new ApiResponse(200, null, "Waiting for opponent..."));
    }
});

export const getGameDetails = asyncHandler(async (req, res) => {
    const { gameId } = req.params;
    
    // Populate the plural questions field
    const game = await Game.findOne({ roomId: gameId }).populate("questions");

    if (!game) {
        throw new ApiError(404, "Game not found");
    }

    return res.status(200).json(
        new ApiResponse(200, game, "Game details fetched successfully")
    );
});