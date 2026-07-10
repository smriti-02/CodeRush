// backend/src/socket/state.js

export const onlinePlayers = new Set();
export const playingPlayers = new Set();
export let waitingQueue = []; 
export const activeGames = new Map();

export const broadcastStats = (io) => {
    io.emit("playerCountUpdate", {
        online: onlinePlayers.size,
        playing: playingPlayers.size
    });
};

// Helper to safely mutate the queue
export const setWaitingQueue = (newQueue) => {
    waitingQueue = newQueue;
};