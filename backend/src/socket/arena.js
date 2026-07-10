// backend/src/socket/arena.js
import { activeGames, onlinePlayers, playingPlayers, waitingQueue, setWaitingQueue, broadcastStats } from './state.js';

export const handleArenaEvents = (io, socket, userId) => {
    
    // Live Status Broadcasting
    socket.on("playerStatusUpdate", ({ gameId, status }) => {
        socket.to(gameId).emit("opponentStatusUpdate", { status });
    });

    // Handle Reconnections
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
};

export const handleDisconnect = (io, socket, userId) => {
    console.log(`User disconnected: ${userId}`);
    onlinePlayers.delete(userId);
    playingPlayers.delete(userId);
    
    setWaitingQueue(waitingQueue.filter(p => p.userId !== userId));
    
    // Reconnect Grace Period (1.5 minutes)
    for (const [gameId, game] of activeGames.entries()) {
        if (game.players[userId]) {
            game.players[userId].status = 'disconnected';
            socket.to(gameId).emit("opponentStatusUpdate", { status: "Disconnected... (90s to forfeit)" });

            game.disconnectTimers[userId] = setTimeout(() => {
                io.to(gameId).emit("matchEnded", { reason: 'forfeit', loser: userId });
                clearInterval(game.interval);
                activeGames.delete(gameId);
            }, 90000); 
        }
    }
    
    broadcastStats(io);
};