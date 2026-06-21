import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import { User } from "./models/user.models.js"; 

dotenv.config({ path: "./.env" });

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
});

// --- SOCKET AUTHENTICATION MIDDLEWARE ---
io.use(async (socket, next) => {
    try {
        // 1. Extract the token. 
        const token = socket.handshake.auth?.token || getCookieValue(socket.handshake.headers?.cookie, "accessToken");
        
        if (!token) {
            return next(new Error("Unauthorized: No token provided"));
        }

        // 2. Verify the JWT
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 3. Fetch the user from the database
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if (!user) {
            return next(new Error("Unauthorized: Invalid user"));
        }

        // 4. Attach the verified user object to the socket for the rest of the connection lifecycle
        socket.user = user;
        
        // 5. Allow the connection to proceed
        next();
    } catch (error) {
        console.error("Socket Auth Error:", error.message);
        return next(new Error("Unauthorized: Token verification failed"));
    }
});

// Helper function to parse cookies from the handshake headers
function getCookieValue(cookieString, cookieName) {
    if (!cookieString) return null;
    const match = cookieString.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
    return match ? match[2] : null;
}

let onlinePlayers = new Set();
let playingPlayers = new Set();

io.on("connection", (socket) => {
    // We no longer rely on the query parameter. We use the securely verified user ID.
    const userId = socket.user._id.toString();
    
    console.log(`User connected: ${userId}`);
    onlinePlayers.add(userId);
    
    // Broadcast total online count
    io.emit("playerCountUpdate", {
        online: onlinePlayers.size,
        playing: playingPlayers.size
    });

    socket.on("joinGame", (gameId) => {
        socket.join(gameId);
        playingPlayers.add(userId);
        io.emit("playerCountUpdate", {
            online: onlinePlayers.size,
            playing: playingPlayers.size
        });
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${userId}`);
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
});

export { io };