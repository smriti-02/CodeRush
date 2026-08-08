import { asyncHandler } from "../utils/asyncHandler.js";
import { Game } from "../models/game.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const callOpenRouter = async (messages, model = "nvidia/nemotron-3-ultra-550b-a55b:free") => {
    if (!OPENROUTER_API_KEY) {
        throw new ApiError(500, "OpenRouter API key is not configured.");
    }
    const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", {
        model,
        messages
    }, {
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        }
    });

    return response.data.choices[0].message.content;
};

export const getGameReview = asyncHandler(async (req, res) => {
    const { gameId } = req.params;

    let game = await Game.findOne({ roomId: gameId }).populate("questions").populate("players.user", "username");
    if (!game && gameId.match(/^[0-9a-fA-F]{24}$/)) {
        game = await Game.findById(gameId).populate("questions").populate("players.user", "username");
    }

    if (!game) {
        throw new ApiError(404, "Game not found");
    }

    const question = game.questions[0];
    const userPlayer = game.players.find(p => p.user._id.toString() === req.user._id.toString());
    const opponentPlayer = game.players.find(p => p.user._id.toString() !== req.user._id.toString());

    if (!userPlayer) {
        throw new ApiError(403, "You were not a part of this game.");
    }

    const userLastSubmission = userPlayer.submissions.length > 0 ? userPlayer.submissions[userPlayer.submissions.length - 1] : null;
    const opponentLastSubmission = opponentPlayer && opponentPlayer.submissions.length > 0 ? opponentPlayer.submissions[opponentPlayer.submissions.length - 1] : null;

    const systemPrompt = `You are an expert competitive programming AI coach. Analyze the match provided. Be constructive, analytical, and concise. Format your response beautifully in Markdown.`;
    
    let userPrompt = `Match Review Request:\n\n**Problem:** ${question.title}\n\n**Difficulty:** ${question.difficulty}\n\n**Description:** ${question.content}\n\n`;
    
    if (userLastSubmission) {
        userPrompt += `**My Code (${userLastSubmission.language}):**\n\`\`\`${userLastSubmission.language}\n${userLastSubmission.code}\n\`\`\`\n**My Result:** ${userLastSubmission.status}\n\n`;
    } else {
        userPrompt += `**My Code:** I did not submit any code.\n\n`;
    }

    if (opponentLastSubmission) {
        userPrompt += `**Opponent's Code (${opponentLastSubmission.language}):**\n\`\`\`${opponentLastSubmission.language}\n${opponentLastSubmission.code}\n\`\`\`\n**Opponent's Result:** ${opponentLastSubmission.status}\n\n`;
    } else {
        userPrompt += `**Opponent's Code:** Opponent did not submit any code.\n\n`;
    }

    userPrompt += `Please review what I did right, what the opponent did (if applicable), whose approach was better in terms of time/space complexity, and what the most optimal approach to this problem is.`;

    const review = await callOpenRouter([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ]);

    return res.status(200).json(new ApiResponse(200, review, "Game review generated successfully."));
});

export const getAccountAnalysis = asyncHandler(async (req, res) => {
    // Fetch last 10 games for analysis
    const games = await Game.find({ 'players.user': req.user._id })
        .populate('questions', 'title difficulty topicTags')
        .sort({ createdAt: -1 })
        .limit(10);

    let summary = `User has played ${games.length} recent games.\n`;
    
    const submissionsData = [];
    games.forEach(game => {
        const player = game.players.find(p => p.user.toString() === req.user._id.toString());
        const question = game.questions[0];
        if (player && question) {
            const lastSub = player.submissions.length > 0 ? player.submissions[player.submissions.length - 1] : null;
            submissionsData.push({
                problem: question.title,
                difficulty: question.difficulty,
                tags: question.topicTags?.map(t => t.name).join(", "),
                result: lastSub ? lastSub.status : "No submission",
                code: lastSub ? lastSub.code : ""
            });
        }
    });

    const systemPrompt = `You are a highly experienced competitive programming mentor. Analyze the user's recent performance. Provide insights on their strong suits, their weaknesses (e.g. brute force tendencies, missed edge cases), and actionable advice on what topics to practice. Format your response beautifully in Markdown.`;
    
    let userPrompt = `Here is a summary of my recent competitive programming activity:\n\n`;
    submissionsData.forEach((sub, i) => {
        userPrompt += `**Game ${i + 1}:** Problem: ${sub.problem} (${sub.difficulty}). Tags: ${sub.tags}. Result: ${sub.result}.\n`;
        if (sub.code) {
            userPrompt += `Submitted Code snippet (truncated):\n\`\`\`\n${sub.code.substring(0, 300)}${sub.code.length > 300 ? '\n... (truncated)' : ''}\n\`\`\`\n\n`;
        }
    });

    userPrompt += `Please provide a holistic account analysis detailing my weaknesses, strong suits, and specific recommendations for improvement.`;

    const analysis = await callOpenRouter([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ]);

    return res.status(200).json(new ApiResponse(200, analysis, "Account analysis generated successfully."));
});

export const askChatbot = asyncHandler(async (req, res) => {
    const { context, messages } = req.body;

    if (!context || !messages || !Array.isArray(messages)) {
        throw new ApiError(400, "Missing context or invalid messages array");
    }

    const systemPrompt = `You are a helpful AI assistant for the competitive programming platform 'CodeRush'. 
You have previously provided the following analysis/review to the user:
---
${context}
---
The user has follow-up questions about it. 
CRITICAL RULE: You MUST ONLY answer questions strictly related to this review, competitive programming, algorithms, or data structures. If the user asks about anything unrelated (e.g. general knowledge, writing essays, recipes, etc.), politely decline and say you can only help with CodeRush and programming questions.`;

    const fullMessages = [
        { role: "system", content: systemPrompt },
        ...messages
    ];

    const reply = await callOpenRouter(fullMessages, "google/gemma-4-31b-it:free");

    return res.status(200).json(new ApiResponse(200, reply, "Chatbot replied successfully."));
});
