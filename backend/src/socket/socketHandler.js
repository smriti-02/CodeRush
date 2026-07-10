let onlinePlayers = new Set();
let playingPlayers = new Set();
let waitingQueue = []; // Now stores: { userId, socket, topics, timeLimit, difficulty, joinedAt }
const activeGames = new Map(); // Phase 1: Track active match states

const difficultyRank = { easy: 1, medium: 2, hard: 3 };

// Helpers
const getLowerDifficulty = (d1, d2) => difficultyRank[d1] <= difficultyRank[d2] ? d1 : d2;

const broadcastStats = (io) => {
    io.emit("playerCountUpdate", {
        online: onlinePlayers.size,
        playing: playingPlayers.size
    });
};

const startGame = (io, player1, player2, matchConfig) => {
    const gameRoomId = `game_${Date.now()}_${player1.userId}_${player2.userId}`;

    player1.socket.join(gameRoomId);
    player2.socket.join(gameRoomId);

    playingPlayers.add(player1.userId);
    playingPlayers.add(player2.userId);

    // Phase 1: Initialize Global Timer State
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

    // Send the match config back to the frontend so they know the final rules
    io.to(gameRoomId).emit("matchFound", {
        gameId: gameRoomId,
        message: "Opponent found! Preparing arena...",
        matchConfig
    });

    broadcastStats(io);
    console.log(`Match started in room: ${gameRoomId} | Config:`, matchConfig);
};

export const initializeSocketHandlers = (io) => {
    // IDLE FALLBACK LOOP: Runs every 5 seconds to force-match idle players
    setInterval(() => {
        if (waitingQueue.length >= 2) {
            const now = Date.now();
            
            // Find someone who has been waiting longer than 10 seconds
            const idlePlayerIdx = waitingQueue.findIndex(p => now - p.joinedAt > 10000);

            if (idlePlayerIdx !== -1) {
                const player1 = waitingQueue.splice(idlePlayerIdx, 1)[0];
                const player2 = waitingQueue.shift(); // Grab whoever is next in line

                const combinedTopics = [...new Set([...player1.topics, ...player2.topics])];
                const selectedTopic = combinedTopics[Math.floor(Math.random() * combinedTopics.length)];
                
                const finalTimeLimit = Math.min(player1.timeLimit, player2.timeLimit);
                const finalDifficulty = getLowerDifficulty(player1.difficulty, player2.difficulty);

                startGame(io, player1, player2, {
                    topic: selectedTopic,
                    timeLimit: finalTimeLimit,
                    difficulty: finalDifficulty,
                    isFallback: true 
                });
            }
        }
    }, 5000);

    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        
        console.log(`User connected: ${userId}`);
        onlinePlayers.add(userId);
        broadcastStats(io);

        // Frontend should emit: socket.emit("findMatch", { topics: ["DP", "Arrays"], timeLimit: 10, difficulty: "medium" })
        socket.on("findMatch", (preferences) => {
            const { topics, timeLimit, difficulty } = preferences;
            console.log(`User ${userId} clicked Find Match with config:`, preferences);

            const alreadyInQueue = waitingQueue.find(p => p.userId === userId);
            if (alreadyInQueue) return;

            const newPlayer = { userId, socket, topics, timeLimit, difficulty, joinedAt: Date.now() };

            // 1. STRICT MATCH CHECK
            const matchIdx = waitingQueue.findIndex(p => 
                p.timeLimit === timeLimit && 
                p.difficulty === difficulty && 
                p.topics.some(t => topics.includes(t)) 
            );

            if (matchIdx !== -1) {
                // Strict match found!
                const opponent = waitingQueue.splice(matchIdx, 1)[0];
                
                const sharedTopics = opponent.topics.filter(t => topics.includes(t));
                const selectedTopic = sharedTopics[Math.floor(Math.random() * sharedTopics.length)];

                startGame(io, newPlayer, opponent, {
                    topic: selectedTopic,
                    timeLimit,
                    difficulty,
                    isFallback: false
                });
            } else {
                waitingQueue.push(newPlayer);
            }
        });

        // Phase 1: Live Status Broadcasting
        socket.on("playerStatusUpdate", ({ gameId, status }) => {
            socket.to(gameId).emit("opponentStatusUpdate", { status });
        });

        // Phase 1: Handle Reconnections
        socket.on("rejoinMatch", ({ gameId }) => {
            const game = activeGames.get(gameId);
            if (game && game.players[userId]) {
                if (game.disconnectTimers[userId]) {
                    clearTimeout(game.disconnectTimers[userId]);
                    delete game.disconnectTimers[userId];
                }
                game.players[userId].status = 'connected';
                game.players[userId].socketId = socket.id;
                socket.join(gameId);
                
                socket.to(gameId).emit("opponentStatusUpdate", { status: "Opponent reconnected!" });
                socket.emit("timerUpdate", { timeLeft: game.timeLeft });
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId}`);
            onlinePlayers.delete(userId);
            playingPlayers.delete(userId);
            
            waitingQueue = waitingQueue.filter(p => p.userId !== userId);
            
            // Phase 1: Reconnect Grace Period (1.5 minutes)
            for (const [gameId, game] of activeGames.entries()) {
                if (game.players[userId]) {
                    game.players[userId].status = 'disconnected';
                    socket.to(gameId).emit("opponentStatusUpdate", { status: "Disconnected... (90s to forfeit)" });

                    game.disconnectTimers[userId] = setTimeout(() => {
                        io.to(gameId).emit("matchEnded", { reason: 'forfeit', loser: userId });
                        clearInterval(game.interval);
                        activeGames.delete(gameId);
                    }, 90000); // 1.5 minutes
                }
            }
            
            broadcastStats(io);
        });
    });
};