// backend/src/socket/socketHandler.js
import { onlinePlayers, playingPlayers, activeGames, broadcastStats } from './state.js';
import { handleMatchmaking, startIdleFallbackLoop } from './matchmaking.js';
import { handleArenaEvents, handleDisconnect } from './arena.js';

export const initializeSocketHandlers = (io) => {
    
    // Initialize global server loops
    startIdleFallbackLoop(io);

    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        
        console.log(`User connected: ${userId} (socket: ${socket.id})`);
        onlinePlayers.add(userId);

        // Check if user has an active game with an ongoing disconnect timer
        for (const [gameId, game] of activeGames.entries()) {
            if (game.players && game.players[userId]) {
                playingPlayers.add(userId);
                if (game.disconnectTimers && game.disconnectTimers[userId]) {
                    console.log(`[Arena] Auto-clearing disconnect timer for ${userId} in active game ${gameId}`);
                    clearTimeout(game.disconnectTimers[userId]);
                    delete game.disconnectTimers[userId];
                }
                game.players[userId].status = 'connected';
                game.players[userId].socketId = socket.id;
                socket.join(gameId);
                socket.to(gameId).emit("opponentStatusUpdate", { status: "Opponent reconnected!" });
            }
        }

        broadcastStats(io);

        // Wire up domain-specific events
        handleMatchmaking(io, socket, userId);
        handleArenaEvents(io, socket, userId);

        // Handle teardown
        socket.on("disconnect", () => {
            handleDisconnect(io, socket, userId);
        });
    });
};