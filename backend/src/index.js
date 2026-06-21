import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import { Server } from "socket.io";
import http from "http";
import { verifySocketJWT } from "./middlewares/socketAuth.middleware.js";
import { initializeSocketHandlers } from "./socket/socketHandler.js";

dotenv.config({ path: "./.env" });

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
});

// 1. Apply Authentication
io.use(verifySocketJWT);

// 2. Initialize Socket Events & Matchmaking
initializeSocketHandlers(io);

// 3. Start Server
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