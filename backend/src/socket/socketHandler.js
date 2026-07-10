// backend/src/socket/socketHandler.js
import { onlinePlayers, broadcastStats } from './state.js';
import { handleMatchmaking, startIdleFallbackLoop } from './matchmaking.js';
import { handleArenaEvents, handleDisconnect } from './arena.js';

export const initializeSocketHandlers = (io) => {
    
    // Initialize global server loops
    startIdleFallbackLoop(io);

    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        
        console.log(`User connected: ${userId}`);
        onlinePlayers.add(userId);
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