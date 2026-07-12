// backend/src/socket/state.js
export const onlinePlayers = new Set();
export const playingPlayers = new Set();
export let waitingQueue = []; 
export const activeGames = new Map();
export const pendingMatches = new Map(); // Tracks matches waiting for user confirmation

export const broadcastStats = (io) => {
    io.emit("playerCountUpdate", {
        online: onlinePlayers.size,
        playing: playingPlayers.size
    });
};

export const setWaitingQueue = (newQueue) => {
    waitingQueue = newQueue;
};