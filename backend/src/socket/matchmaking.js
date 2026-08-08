import { waitingQueue, playingPlayers, activeGames, pendingMatches, onlinePlayers, broadcastStats } from './state.js';
import { User } from '../models/user.model.js';
import { Question } from '../models/questions.model.js';
import { Game } from '../models/game.model.js';
import crypto from "crypto";

const difficultyRank = { easy: 1, medium: 2, hard: 3 };
const getLowerDifficulty = (d1, d2) => difficultyRank[d1] <= difficultyRank[d2] ? d1 : d2;

const getOrCreateBotUser = async () => {
    let botUser = await User.findOne({ username: 'CodeRush_Bot' });
    if (!botUser) {
        botUser = await User.create({
            username: 'CodeRush_Bot',
            email: 'bot@coderush.com',
            password: crypto.randomBytes(16).toString("hex"), 
            elo: 1500
        });
    }
    return botUser;
};

const startBotMatch = async (io, player) => {
    try {
        const botUser = await getOrCreateBotUser();
        
        const selectedTopic = player.topics[0] || 'Arrays';
        const formattedDifficulty = player.difficulty.charAt(0).toUpperCase() + player.difficulty.slice(1);
        
        const randomQuestions = await Question.aggregate([
            {
                $match: {
                    difficulty: formattedDifficulty,
                    "topicTags.name": new RegExp(selectedTopic, 'i'),
                    allTestCases: { $exists: true, $type: 'array', $ne: [] }
                }
            },
            { $sample: { size: 1 } }
        ]);

        const selectedQuestion = randomQuestions.length > 0 ? randomQuestions[0] : await Question.findOne(); 
        
        if (!selectedQuestion) {
            io.to(player.socketId).emit("matchEnded", { reason: "Server Error: No questions available." });
            return; 
        }

        const gameRoomId = crypto.randomBytes(8).toString("hex");

        await Game.create({
            roomId: gameRoomId,
            players: [
                { user: player.userId, socketId: player.socketId, status: 'connected' },
                { user: botUser._id, socketId: 'bot_socket_id', status: 'connected' }
            ],
            questions: [selectedQuestion._id],
            settings: { duration: player.timeLimit, mode: 'classic' },
            status: 'Pending'
        });

        const p1Socket = io.sockets.sockets.get(player.socketId);
        if (p1Socket) p1Socket.join(gameRoomId);

        playingPlayers.add(player.userId);

        const durationSeconds = player.timeLimit * 60;
        
        // Calculate dynamic bot solve time based on difficulty and time limit
        // Easy: 20-40% of time limit
        // Medium: 40-70% of time limit
        // Hard: 70-95% of time limit
        const diffMultiplier = formattedDifficulty === 'Easy' ? { min: 0.2, max: 0.4 } :
                               formattedDifficulty === 'Medium' ? { min: 0.4, max: 0.7 } :
                               { min: 0.7, max: 0.95 };
        
        const solveTimeRatio = Math.random() * (diffMultiplier.max - diffMultiplier.min) + diffMultiplier.min;
        const botSolveTimeSeconds = Math.floor(durationSeconds * solveTimeRatio);
        
        activeGames.set(gameRoomId, {
            timeLeft: durationSeconds,
            botSolveTime: durationSeconds - botSolveTimeSeconds, // The timeLeft when bot solves it
            botStatusTimer: 0,
            isBotMatch: true,
            players: {
                [player.userId]: { socketId: player.socketId, status: 'connected' },
                [botUser._id.toString()]: { socketId: 'bot_socket_id', status: 'connected', isBot: true }
            },
            disconnectTimers: {},
            interval: setInterval(() => {
                const game = activeGames.get(gameRoomId);
                if (!game) return;
                
                game.timeLeft--;
                io.to(gameRoomId).emit("timerUpdate", { timeLeft: game.timeLeft });
                
                // Simulate Bot activity
                if (game.isBotMatch && game.timeLeft > game.botSolveTime) {
                    game.botStatusTimer++;
                    if (game.botStatusTimer > 15) { // update status every ~15 seconds
                        game.botStatusTimer = 0;
                        const statuses = ["Typing...", "Compiling...", "Idle", "Thinking...", "Reading Question..."];
                        const status = statuses[Math.floor(Math.random() * statuses.length)];
                        // Broadcast only to the player, which is essentially the room since bot has fake socket
                        io.to(gameRoomId).emit('opponentStatusUpdate', { status });
                    }
                }
                
                // Bot wins!
                if (game.isBotMatch && game.timeLeft <= game.botSolveTime && game.botSolveTime > 0) {
                    game.botSolveTime = 0; // trigger only once
                    io.to(gameRoomId).emit('opponentStatusUpdate', { status: "Finished!" });
                    
                    Game.findOne({ roomId: gameRoomId }).then(gameDoc => {
                        if (gameDoc && gameDoc.status !== 'Completed') {
                            gameDoc.status = 'Completed';
                            gameDoc.winner = botUser._id;
                            gameDoc.eloChange = 10;
                            gameDoc.save();
                        }
                    });
                    
                    io.to(gameRoomId).emit("matchEnded", { reason: 'opponent_finished' });
                    clearInterval(game.interval);
                    activeGames.delete(gameRoomId);
                    return;
                }
                
                if (game.timeLeft <= 0) {
                    clearInterval(game.interval);
                    io.to(gameRoomId).emit("matchEnded", { reason: 'timeout' });
                    activeGames.delete(gameRoomId);
                }
            }, 1000)
        });

        io.to(player.socketId).emit("matchFound", { 
            gameId: gameRoomId, 
            message: "Queue timeout. Matching with Bot...", 
            matchConfig: { topic: selectedTopic, timeLimit: player.timeLimit, difficulty: player.difficulty, isBot: true } 
        });
        
        broadcastStats(io);
    } catch (err) {
        console.error("Error starting bot match:", err);
    }
};

export const startGame = async (io, player1, player2, matchConfig) => {
    try {
        const formattedDifficulty = matchConfig.difficulty.charAt(0).toUpperCase() + matchConfig.difficulty.slice(1);
        
        const randomQuestions = await Question.aggregate([
            {
                $match: {
                    difficulty: formattedDifficulty,
                    "topicTags.name": new RegExp(matchConfig.topic, 'i'),
                    allTestCases: { $exists: true, $type: 'array', $ne: [] }
                }
            },
            { $sample: { size: 1 } }
        ]);

        const selectedQuestion = randomQuestions.length > 0 ? randomQuestions[0] : await Question.findOne(); 
        
        if (!selectedQuestion) {
            io.to(player1.socketId).emit("matchEnded", { reason: "Server Error: No questions available." });
            io.to(player2.socketId).emit("matchEnded", { reason: "Server Error: No questions available." });
            return; 
        }

        // 1. Generate a clean, 16-character roomId just like the HTTP controller
        const gameRoomId = crypto.randomBytes(8).toString("hex");

        // 2. Create the Game document using the correct schema values
        await Game.create({
            roomId: gameRoomId, // Clean ID!
            players: [
                { user: player1.userId, socketId: player1.socketId, status: 'connected' },
                { user: player2.userId, socketId: player2.socketId, status: 'connected' }
            ],
            questions: [selectedQuestion._id],
            settings: { duration: matchConfig.timeLimit, mode: 'classic' },
            status: 'Pending'
        });

        // Add sockets to the game room
        const p1Socket = io.sockets.sockets.get(player1.socketId);
        const p2Socket = io.sockets.sockets.get(player2.socketId);
        if (p1Socket) p1Socket.join(gameRoomId);
        if (p2Socket) p2Socket.join(gameRoomId);

        playingPlayers.add(player1.userId);
        playingPlayers.add(player2.userId);

        const durationSeconds = matchConfig.timeLimit * 60;
        
        activeGames.set(gameRoomId, {
            timeLeft: durationSeconds,
            players: {
                [player1.userId]: { socketId: player1.socketId, status: 'connected' },
                [player2.userId]: { socketId: player2.socketId, status: 'connected' }
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

export const handleMatchmaking = (io, socket, userId) => {
    
    socket.on("findMatch", (preferences) => {
        const { topics, timeLimit, difficulty, strictMode } = preferences;
        const alreadyInQueue = waitingQueue.findIndex(p => p.userId === userId);
        
        // Remove old phantom queue entries if they exist
        if (alreadyInQueue !== -1) {
            waitingQueue.splice(alreadyInQueue, 1);
        }

        // Store socket.id instead of full socket object
        const newPlayer = { userId, socketId: socket.id, topics, timeLimit: Number(timeLimit), difficulty, strictMode, joinedAt: Date.now() };

        // Strict Check
        const matchIdx = waitingQueue.findIndex(p => 
            p.timeLimit === newPlayer.timeLimit && 
            p.difficulty === newPlayer.difficulty && 
            p.topics.some(t => newPlayer.topics.includes(t)) 
        );

        if (matchIdx !== -1) {
            const opponent = waitingQueue.splice(matchIdx, 1)[0];
            const sharedTopics = opponent.topics.filter(t => newPlayer.topics.includes(t));
            const selectedTopic = sharedTopics[Math.floor(Math.random() * sharedTopics.length)];
            
            console.log(`🚀 Strict Match Found instantly: ${newPlayer.userId} vs ${opponent.userId}`);
            startGame(io, newPlayer, opponent, { topic: selectedTopic, timeLimit: newPlayer.timeLimit, difficulty: newPlayer.difficulty, isFallback: false });
        } else {
            console.log(`⏳ ${userId} joined queue. Waiting...`);
            waitingQueue.push(newPlayer);
        }
    });

    // NEW: Allow users to actually leave the queue when they click Cancel
    socket.on("leaveQueue", () => {
        const idx = waitingQueue.findIndex(p => p.userId === userId);
        if (idx !== -1) {
            waitingQueue.splice(idx, 1);
            console.log(`🚪 ${userId} left the queue.`);
        }
    });

    socket.on("acceptProposal", ({ proposalId }) => {
        const proposal = pendingMatches.get(proposalId);
        if (!proposal) return;

        proposal.acceptances.add(userId);
        console.log(`✅ ${userId} accepted proposal ${proposalId}. (${proposal.acceptances.size}/2)`);

        if (proposal.acceptances.size === 2) {
            clearTimeout(proposal.timeout); // Clear the auto-decline timer
            pendingMatches.delete(proposalId);
            startGame(io, proposal.p1, proposal.p2, proposal.config);
        }
    });

    socket.on("rejectProposal", ({ proposalId }) => {
        const proposal = pendingMatches.get(proposalId);
        if (!proposal) return;

        console.log(`❌ ${userId} rejected proposal ${proposalId}.`);
        clearTimeout(proposal.timeout);

        // Put players back in queue with fresh timers
        proposal.p1.joinedAt = Date.now();
        proposal.p2.joinedAt = Date.now();
        waitingQueue.unshift(proposal.p1, proposal.p2);
        
        pendingMatches.delete(proposalId);
        
        const otherPlayer = proposal.p1.userId === userId ? proposal.p2 : proposal.p1;
        io.to(otherPlayer.socketId).emit("proposalDeclined", { message: "Opponent declined." });
    });
};

export const startIdleFallbackLoop = (io) => {
    setInterval(() => {
        try {
            const now = Date.now();
            
            for (let i = 0; i < waitingQueue.length; i++) {
                const p1 = waitingQueue[i];
                const waited = now - p1.joinedAt;

                if (waited >= 5000) {
                    waitingQueue.splice(i, 1);
                    startBotMatch(io, p1);
                    i--;
                    continue;
                }

                if (p1.strictMode) continue;

                for (let j = i + 1; j < waitingQueue.length; j++) {
                    const p2 = waitingQueue[j];
                    if (p2.strictMode) continue;

                    const p2Waited = now - p2.joinedAt;
                    const maxWaited = Math.max(waited, p2Waited);

                    let proposeMatch = false;

                    const difficultyGap = Math.abs(difficultyRank[p1.difficulty] - difficultyRank[p2.difficulty]);
                    const allowedGap = onlinePlayers.size > 50 ? 1 : 2;

                    if (maxWaited >= 30000 && maxWaited < 45000) {
                        if (p1.timeLimit === p2.timeLimit && p1.difficulty === p2.difficulty) {
                            proposeMatch = true;
                        }
                    } else if (maxWaited >= 45000) {
                        if (difficultyGap <= allowedGap) {
                            proposeMatch = true;
                        }
                    }

                    if (proposeMatch) {
                        waitingQueue.splice(j, 1);
                        waitingQueue.splice(i, 1);
                        
                        const proposalId = `prop_${Date.now()}`;
                        const avgTime = Math.round((p1.timeLimit + p2.timeLimit) / 2);
                        const lowestDiff = getLowerDifficulty(p1.difficulty, p2.difficulty);
                        const combinedTopics = [...new Set([...p1.topics, ...p2.topics])];
                        const proposedTopic = combinedTopics[Math.floor(Math.random() * combinedTopics.length)];

                        const config = { topic: proposedTopic, timeLimit: avgTime, difficulty: lowestDiff, isFallback: true };

                        console.log(`🤝 Proposing match between ${p1.userId} and ${p2.userId} -> Topic: ${proposedTopic}`);

                        // NEW: Auto-decline if they don't answer in 15 seconds
                        const timeout = setTimeout(() => {
                            if (pendingMatches.has(proposalId)) {
                                console.log(`⏰ Proposal ${proposalId} timed out. Back to queue.`);
                                p1.joinedAt = Date.now();
                                p2.joinedAt = Date.now();
                                waitingQueue.unshift(p1, p2);
                                pendingMatches.delete(proposalId);
                                io.to(p1.socketId).emit("proposalDeclined", { message: "Proposal timed out." });
                                io.to(p2.socketId).emit("proposalDeclined", { message: "Proposal timed out." });
                            }
                        }, 15000);

                        pendingMatches.set(proposalId, {
                            p1, p2, config, acceptances: new Set(), timeout
                        });

                        io.to(p1.socketId).emit("matchProposed", { proposalId, config, opponentTopics: p2.topics });
                        io.to(p2.socketId).emit("matchProposed", { proposalId, config, opponentTopics: p1.topics });

                        i--; 
                        break;
                    }
                }
            }
        } catch (err) {
            console.error("❌ Fallback loop error:", err);
        }
    }, 5000);
};