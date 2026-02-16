import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { Server } from "socket.io";
import http from "http";
dotenv.config(
    {path: "./.env"}
);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
});

let onlinePlayers = new Set();
let playingPlayers = new Set();

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
        onlinePlayers.add(userId);
        // Broadcast total online count
        io.emit("playerCountUpdate", {
            online: onlinePlayers.size,
            playing: playingPlayers.size
        });
    }

    socket.on("joinGame", (gameId) => {
        socket.join(gameId);
        if (userId) playingPlayers.add(userId);
        io.emit("playerCountUpdate", {
            online: onlinePlayers.size,
            playing: playingPlayers.size
        });
    });

    socket.on("disconnect", () => {
        onlinePlayers.delete(userId);
        playingPlayers.delete(userId);
        io.emit("playerCountUpdate", {
            online: onlinePlayers.size,
            playing: playingPlayers.size
        });
    });
});

connectDB()
.then(() => {
    server.on("error", (err) => {
        console.log("Error occurred while starting the server", err)
    });
    server.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    })
})
.catch((err) => {
    console.log("Mongo DB connection failed!!", err)
})

export { io };


