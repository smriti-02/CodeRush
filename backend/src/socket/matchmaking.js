// backend/src/socket/matchmaking.js
import { waitingQueue, playingPlayers, activeGames, broadcastStats } from './state.js';
import { Question } from '../models/questions.model.js';
import { Game } from '../models/game.model.js';

const difficultyRank = { easy: 1, medium: 2, hard: 3 };
const getLowerDifficulty = (d1, d2) => difficultyRank[d1] <= difficultyRank[d2] ? d1 : d2;

export const startGame = async (io, player1, player2, matchConfig) => {
    try {
        const formattedDifficulty = matchConfig.difficulty.charAt(0).toUpperCase() + matchConfig.difficulty.slice(1);
        
        const randomQuestions = await Question.aggregate([
            { $match: { difficulty: formattedDifficulty, "topicTags.name": new RegExp(matchConfig.topic, 'i') } },
            { $sample: { size: 1 } }
        ]);

        const selectedQuestion = randomQuestions.length > 0 ? randomQuestions[0] : await Question.findOne(); 
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

export const handleMatchmaking = (io, socket, userId) => {
    socket.on("findMatch", (preferences) => {
        const { topics, timeLimit, difficulty } = preferences;
        const alreadyInQueue = waitingQueue.find(p => p.userId === userId);
        if (alreadyInQueue) return;

        const newPlayer = { userId, socket, topics, timeLimit, difficulty, joinedAt: Date.now() };

        const matchIdx = waitingQueue.findIndex(p => 
            p.timeLimit === timeLimit && 
            p.difficulty === difficulty && 
            p.topics.some(t => topics.includes(t)) 
        );

        if (matchIdx !== -1) {
            const opponent = waitingQueue.splice(matchIdx, 1)[0];
            const sharedTopics = opponent.topics.filter(t => topics.includes(t));
            const selectedTopic = sharedTopics[Math.floor(Math.random() * sharedTopics.length)];

            startGame(io, newPlayer, opponent, { topic: selectedTopic, timeLimit, difficulty, isFallback: false });
        } else {
            waitingQueue.push(newPlayer);
        }
    });
};

export const startIdleFallbackLoop = (io) => {
    setInterval(() => {
        if (waitingQueue.length >= 2) {
            const now = Date.now();
            const idlePlayerIdx = waitingQueue.findIndex(p => now - p.joinedAt > 10000);

            if (idlePlayerIdx !== -1) {
                const player1 = waitingQueue.splice(idlePlayerIdx, 1)[0];
                const player2 = waitingQueue.shift(); 
                
                const combinedTopics = [...new Set([...player1.topics, ...player2.topics])];
                const selectedTopic = combinedTopics[Math.floor(Math.random() * combinedTopics.length)];
                
                const finalTimeLimit = Math.min(player1.timeLimit, player2.timeLimit);
                const finalDifficulty = getLowerDifficulty(player1.difficulty, player2.difficulty);

                startGame(io, player1, player2, { topic: selectedTopic, timeLimit: finalTimeLimit, difficulty: finalDifficulty, isFallback: true });
            }
        }
    }, 5000);
};