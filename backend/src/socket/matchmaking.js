import { waitingQueue, playingPlayers, activeGames, pendingMatches, onlinePlayers, broadcastStats } from './state.js';
import { Question } from '../models/questions.model.js';
import { Game } from '../models/game.model.js';

const difficultyRank = { easy: 1, medium: 2, hard: 3 };
const getLowerDifficulty = (d1, d2) => difficultyRank[d1] <= difficultyRank[d2] ? d1 : d2;

const startBotMatch = async (io, player) => {
    const selectedTopic = player.topics[0] || 'Arrays';
    
    io.to(player.socketId).emit("matchFound", { 
        gameId: `bot_game_${Date.now()}`, 
        message: "Queue timeout. Matching with Bot...", 
        matchConfig: { topic: selectedTopic, timeLimit: player.timeLimit, difficulty: player.difficulty, isBot: true } 
    });
};

export const startGame = async (io, player1, player2, matchConfig) => {
    try {
        const formattedDifficulty = matchConfig.difficulty.charAt(0).toUpperCase() + matchConfig.difficulty.slice(1);
        
        const randomQuestions = await Question.aggregate([
            { $match: { difficulty: formattedDifficulty, "topicTags.name": new RegExp(matchConfig.topic, 'i') } },
            { $sample: { size: 1 } }
        ]);

        const selectedQuestion = randomQuestions.length > 0 ? randomQuestions[0] : await Question.findOne(); 
        
        if (!selectedQuestion) {
            io.to(player1.socketId).emit("matchEnded", { reason: "Server Error: No questions available." });
            io.to(player2.socketId).emit("matchEnded", { reason: "Server Error: No questions available." });
            return; 
        }

        const gameRoomId = `game_${Date.now()}_${player1.userId}_${player2.userId}`;

        await Game.create({
            roomId: gameRoomId,
            players: [
                { user: player1.userId, socketId: player1.socketId },
                { user: player2.userId, socketId: player2.socketId }
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

                if (waited >= 300000) {
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