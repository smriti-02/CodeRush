import dotenv from "dotenv";
import fs from 'fs';
import connectDB from "./db/index.js";
import app from "./app.js";
import { Server } from "socket.io";
import http from "http";
import { verifySocketJWT } from "./middlewares/socketAuth.middleware.js";
import { initializeSocketHandlers } from "./socket/socketHandler.js";

// Load base .env then overlay .env.local when present
dotenv.config({ path: './.env' });
if (fs.existsSync('./.env.local')) {
    dotenv.config({ path: './.env.local', override: true });
}

import { warmUpJudgeEngine } from "./services/judge.services.js";

if (!process.env.VERCEL_TOKEN && !process.env.VERCEL_API_TOKEN && !process.env.VERCEL_OIDC_TOKEN && process.env.NODE_ENV !== 'production' && process.env.USE_LOCAL_JUDGE !== 'true') {
    console.log('Warning: No Vercel token set (VERCEL_TOKEN or VERCEL_OIDC_TOKEN). Set VERCEL_TOKEN for external deploys like Render, or set USE_LOCAL_JUDGE=true for local runs.');
}

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
        // Pre-warm the sandbox engine in background so first execution is instantaneous
        warmUpJudgeEngine();
    })
})
.catch((err) => {
    console.log("Mongo DB connection failed!!", err)
});

export { io };
export default app;