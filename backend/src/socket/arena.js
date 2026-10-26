// backend/src/socket/arena.js
import { Game } from '../models/game.model.js';
import { activeGames, onlinePlayers, playingPlayers, waitingQueue, setWaitingQueue, broadcastStats } from './state.js';

export const handleArenaEvents = (io, socket, userId) => {
    
    // Live Status Broadcasting
    socket.on("playerStatusUpdate", ({ gameId, status }) => {
        socket.to(gameId).emit("opponentStatusUpdate", { status });
    });

    socket.on("forfeitMatch", async ({ gameId }) => {
        const game = activeGames.get(gameId);
        if (game && game.players[userId]) {
            const opponentId = Object.keys(game.players).find(id => id !== userId);
            
            const gameDoc = await Game.findOne({ roomId: gameId });
            if (gameDoc && gameDoc.status !== 'Completed') {
                gameDoc.status = 'Completed';
                if (opponentId) {
                    gameDoc.winner = opponentId;
                }
                gameDoc.eloChange = 10;
                await gameDoc.save();
            }

            socket.emit("matchEnded", { reason: 'You forfeited the match.' });
            socket.to(gameId).emit("matchEnded", { reason: 'opponent_forfeited' });

            clearInterval(game.interval);
            activeGames.delete(gameId);
            playingPlayers.delete(userId);
            if (opponentId) playingPlayers.delete(opponentId);
        }
    });

    // Handle Reconnections
    socket.on("rejoinMatch", ({ gameId }) => {
        const game = activeGames.get(gameId);
        if (game && game.players && game.players[userId]) {
            if (game.disconnectTimers && game.disconnectTimers[userId]) {
                console.log(`[Arena] RejoinMatch: Cleared disconnect timer for ${userId}`);
                clearTimeout(game.disconnectTimers[userId]);
                delete game.disconnectTimers[userId];
            }
            game.players[userId].status = 'connected';
            game.players[userId].socketId = socket.id;
            playingPlayers.add(userId);
            socket.join(gameId);
            
            socket.to(gameId).emit("opponentStatusUpdate", { status: "Opponent reconnected!" });
            socket.emit("timerUpdate", { timeLeft: game.timeLeft });
        }
    });
};

export const handleDisconnect = (io, socket, userId) => {
    console.log(`User socket disconnected: ${socket.id} (user: ${userId})`);

    // Check if the user has any other active socket connections still open
    const activeUserSockets = Array.from(io.sockets.sockets.values()).filter(
        s => s.user?._id?.toString() === userId && s.id !== socket.id && s.connected
    );

    if (activeUserSockets.length > 0) {
        console.log(`User ${userId} still has ${activeUserSockets.length} other active socket(s). Skipping disconnect forfeit timers.`);
        return;
    }

    onlinePlayers.delete(userId);
    playingPlayers.delete(userId);
    
    setWaitingQueue(waitingQueue.filter(p => p.userId !== userId));
    
    // Reconnect Grace Period (1.5 minutes)
    for (const [gameId, game] of activeGames.entries()) {
        if (game.players && game.players[userId]) {
            game.players[userId].status = 'disconnected';
            socket.to(gameId).emit("opponentStatusUpdate", { status: "Disconnected... (90s to forfeit)" });

            if (game.disconnectTimers[userId]) {
                clearTimeout(game.disconnectTimers[userId]);
            }

            game.disconnectTimers[userId] = setTimeout(async () => {
                const active = activeGames.get(gameId);
                if (!active) return;

                // Safety: verify the player is STILL disconnected before forfeiting
                if (active.players[userId]?.status !== 'disconnected') {
                    console.log(`[Arena] Player ${userId} is reconnected. Aborting 90s forfeit.`);
                    return;
                }

                console.log(`[Arena] 90s grace period expired for ${userId} in game ${gameId}. Declaring forfeit.`);
                io.to(gameId).emit("matchEnded", { reason: 'forfeit', loser: userId });
                clearInterval(active.interval);
                activeGames.delete(gameId);
                playingPlayers.delete(userId);

                try {
                    const opponentId = Object.keys(active.players).find(id => id !== userId);
                    const gameDoc = await Game.findOne({ roomId: gameId });
                    if (gameDoc && gameDoc.status !== 'Completed') {
                        gameDoc.status = 'Completed';
                        if (opponentId) {
                            gameDoc.winner = opponentId;
                        }
                        gameDoc.eloChange = -50;
                        await gameDoc.save();
                    }
                } catch (e) {
                    console.error("[Arena] Error finalizing forfeit match:", e);
                }
            }, 90000); 
        }
    }
    
    broadcastStats(io);
};