let onlinePlayers = new Set();
let playingPlayers = new Set();
let waitingQueue = []; 

// Helper function to broadcast stats
const broadcastStats = (io) => {
    io.emit("playerCountUpdate", {
        online: onlinePlayers.size,
        playing: playingPlayers.size
    });
};

export const initializeSocketHandlers = (io) => {
    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        
        console.log(`User connected: ${userId}`);
        onlinePlayers.add(userId);
        broadcastStats(io);

        socket.on("findMatch", () => {
            const alreadyInQueue = waitingQueue.find(p => p.userId === userId);
            if (alreadyInQueue) return;

            waitingQueue.push({ userId, socket });

            if (waitingQueue.length >= 2) {
                const player1 = waitingQueue.shift();
                const player2 = waitingQueue.shift();
                const gameRoomId = `game_${Date.now()}_${player1.userId}_${player2.userId}`;

                player1.socket.join(gameRoomId);
                player2.socket.join(gameRoomId);

                playingPlayers.add(player1.userId);
                playingPlayers.add(player2.userId);

                io.to(gameRoomId).emit("matchFound", {
                    gameId: gameRoomId,
                    message: "Opponent found! Preparing arena..."
                });

                broadcastStats(io);
                console.log(`Match started in room: ${gameRoomId}`);
            }
        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId}`);
            onlinePlayers.delete(userId);
            playingPlayers.delete(userId);
            
            // Remove from queue if they drop off while searching
            waitingQueue = waitingQueue.filter(p => p.userId !== userId);
            
            broadcastStats(io);
        });
    });
};