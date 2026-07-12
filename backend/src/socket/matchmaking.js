// backend/src/socket/matchmaking.js
import { waitingQueue, playingPlayers, activeGames, pendingMatches, onlinePlayers, broadcastStats } from './state.js';
import { Question } from '../models/questions.model.js';
import { Game } from '../models/game.model.js';

const difficultyRank = { easy: 1, medium: 2, hard: 3 };
const getLowerDifficulty = (d1, d2) => difficultyRank[d1] <= difficultyRank[d2] ? d1 : d2;

// Auto-generates a bot match
const startBotMatch = async (io, player) => {
    const selectedTopic = player.topics[0] || 'Arrays';
    const fakeOpponent = { userId: `bot_${Date.now()}`, socketId: null, username: "CodeRushBot" };
    
    // Setup standard game logic using player's exact preferences
    // (You will reuse your existing startGame logic here, but flag it as a bot match)
    io.to(player.socket.id).emit("matchFound", { 
        gameId: `bot_game_${Date.now()}`, 
        message: "Queue timeout. Matching with Bot...", 
        matchConfig: { topic: selectedTopic, timeLimit: player.timeLimit, difficulty: player.difficulty, isBot: true } 
    });
};

// Start Game (Database Fetching & Initialization)
export const startGame = async (io, player1, player2, matchConfig) => {
    try {
        const formattedDifficulty = matchConfig.difficulty.charAt(0).toUpperCase() + matchConfig.difficulty.slice(1);
        
        const randomQuestions = await Question.aggregate([
            { $match: { difficulty: formattedDifficulty, "topicTags.name": new RegExp(matchConfig.topic, 'i') } },
            { $sample: { size: 1 } }
        ]);

        const selectedQuestion = randomQuestions.length > 0 ? randomQuestions[0] : await Question.findOne(); 
        
        if (!selectedQuestion) {
            io.to(player1.socket.id).emit("matchEnded", { reason: "Server Error: No questions available." });
            io.to(player2.socket.id).emit("matchEnded", { reason: "Server Error: No questions available." });
            return; 
        }

        const gameRoomId = `game_${Date.now()}_${player1.userId}_${player2.userId}`;

        await Game.create({
            roomId: gameRoomId,
            players: [
                { user: player1.userId, socketId: player1.socket.id },
                { user: player2.userId, socketId: player2.socket.id }
            ],
            questions: [selectedQuestion._id],
            settings: { duration: matchConfig.timeLimit, mode: 'classic' },
            status: 'Pending'
        });

        player1.socket.join(gameRoomId);
        player2.socket.join(gameRoomId);

        playingPlayers.add(player1.userId);
        playingPlayers.add(player2.userId);

        const durationSeconds = matchConfig.timeLimit * 60;
        
        activeGames.set(gameRoomId, {
            timeLeft: durationSeconds,
            players: {
                [player1.userId]: { socketId: player1.socket.id, status: 'connected' },
                [player2.userId]: { socketId: player2.socket.id, status: 'connected' }
            },
            disconnectTimers: {},
            interval: setInterval(() => {
                const game = activeGames.get(gameRoomId);
                if (!game) return;
                
                game.timeLeft--;
                io.to(gameRoomId).emit("timerUpdate", { timeLeft: game.timeLeft });
                
                if (game.timeLeft <= 0) {
                    clearInterval(game.interval);
                    io.to(gameRoomId).emit("matchEnded", { reason: 'timeout' });
                    activeGames.delete(gameRoomId);
                }
            }, 1000)
        });

        io.to(gameRoomId).emit("matchFound", { gameId: gameRoomId, message: "Opponent found! Preparing arena...", matchConfig });
        broadcastStats(io);

    } catch (error) {
        console.error("Error starting game:", error);
    }
};

// Listens for direct socket events from the user
export const handleMatchmaking = (io, socket, userId) => {
    
    // NEW: Accepts strictMode boolean
    socket.on("findMatch", (preferences) => {
        const { topics, timeLimit, difficulty, strictMode } = preferences;
        const alreadyInQueue = waitingQueue.find(p => p.userId === userId);
        if (alreadyInQueue) return;

        const newPlayer = { userId, socket, topics, timeLimit, difficulty, strictMode, joinedAt: Date.now() };

        // 0-30s Strict Check
        const matchIdx = waitingQueue.findIndex(p => 
            p.timeLimit === timeLimit && 
            p.difficulty === difficulty && 
            p.topics.some(t => topics.includes(t)) 
        );

        if (matchIdx !== -1) {
            const opponent = waitingQueue.splice(matchIdx, 1)[0];
            const sharedTopics = opponent.topics.filter(t => topics.includes(t));
            const selectedTopic = sharedTopics[Math.floor(Math.random() * sharedTopics.length)];

            // Exact matches skip the proposal box and start immediately
            startGame(io, newPlayer, opponent, { topic: selectedTopic, timeLimit, difficulty, isFallback: false });
        } else {
            waitingQueue.push(newPlayer);
        }
    });

    // Handle Proposal Responses
    socket.on("acceptProposal", ({ proposalId }) => {
        const proposal = pendingMatches.get(proposalId);
        if (!proposal) return;

        proposal.acceptances.add(userId);

        if (proposal.acceptances.size === 2) {
            pendingMatches.delete(proposalId);
            startGame(io, proposal.p1, proposal.p2, proposal.config);
        }
    });

    socket.on("rejectProposal", ({ proposalId }) => {
        const proposal = pendingMatches.get(proposalId);
        if (!proposal) return;

        // Put both players back in front of the queue, resetting their joinedAt so they don't instantly trigger fallback again
        proposal.p1.joinedAt = Date.now();
        proposal.p2.joinedAt = Date.now();
        waitingQueue.unshift(proposal.p1, proposal.p2);
        
        pendingMatches.delete(proposalId);
        
        // Tell the other player it was declined
        const otherPlayer = proposal.p1.userId === userId ? proposal.p2 : proposal.p1;
        io.to(otherPlayer.socket.id).emit("proposalDeclined", { message: "Opponent declined the match settings." });
    });
};

// The Fallback Loop
export const startIdleFallbackLoop = (io) => {
    setInterval(() => {
        const now = Date.now();
        
        for (let i = 0; i < waitingQueue.length; i++) {
            const p1 = waitingQueue[i];
            const waited = now - p1.joinedAt;

            // Trigger Bot Match at 5 minutes (300,000 ms)
            if (waited >= 300000) {
                waitingQueue.splice(i, 1);
                startBotMatch(io, p1);
                i--;
                continue;
            }

            // Skip if player opted out of fallbacks
            if (p1.strictMode) continue;

            for (let j = i + 1; j < waitingQueue.length; j++) {
                const p2 = waitingQueue[j];
                if (p2.strictMode) continue;

                const p2Waited = now - p2.joinedAt;
                const maxWaited = Math.max(waited, p2Waited);

                let proposeMatch = false;

                // Rule 2: Dynamic Difficulty Gap
                const difficultyGap = Math.abs(difficultyRank[p1.difficulty] - difficultyRank[p2.difficulty]);
                const allowedGap = onlinePlayers.size > 50 ? 1 : 2;

                // Rule 1: Time Brackets
                if (maxWaited >= 30000 && maxWaited < 45000) {
                    // 30-45s: Relax Topic only
                    if (p1.timeLimit === p2.timeLimit && p1.difficulty === p2.difficulty) {
                        proposeMatch = true;
                    }
                } else if (maxWaited >= 45000) {
                    // 45s+: Relax Time and Difficulty
                    if (difficultyGap <= allowedGap) {
                        proposeMatch = true;
                    }
                }

                if (proposeMatch) {
                    // Pull from queue
                    waitingQueue.splice(j, 1);
                    waitingQueue.splice(i, 1);
                    
                    const proposalId = `prop_${Date.now()}`;
                    
                    // Rule 4: Average the time
                    const avgTime = Math.round((p1.timeLimit + p2.timeLimit) / 2);
                    // Rule 8: Take the lower difficulty
                    const lowestDiff = getLowerDifficulty(p1.difficulty, p2.difficulty);
                    // Propose a random topic from their combined lists
                    const combinedTopics = [...new Set([...p1.topics, ...p2.topics])];
                    const proposedTopic = combinedTopics[Math.floor(Math.random() * combinedTopics.length)];

                    const config = { topic: proposedTopic, timeLimit: avgTime, difficulty: lowestDiff, isFallback: true };

                    pendingMatches.set(proposalId, {
                        p1, p2, config, acceptances: new Set()
                    });

                    // Emit to clients to show Dialogue Box
                    io.to(p1.socket.id).emit("matchProposed", { proposalId, config, opponentTopics: p2.topics });
                    io.to(p2.socket.id).emit("matchProposed", { proposalId, config, opponentTopics: p1.topics });

                    i--; // Adjust index after splice
                    break;
                }
            }
        }
    }, 5000);
};