import dotenv from "dotenv";
import fs from 'fs';
import connectDB from "./db/index.js";
import app from "./app.js";
import { Server } from "socket.io";
import http from "http";
import { verifySocketJWT } from "./middlewares/socketAuth.middleware.js";
import { initializeSocketHandlers } from "./socket/socketHandler.js";

// Prefer .env.local (from `npx vercel env pull .env.local`) when present
const envPath = fs.existsSync('./.env.local') ? './.env.local' : './.env';
dotenv.config({ path: envPath });

if (!process.env.VERCEL_OIDC_TOKEN && process.env.NODE_ENV !== 'production') {
    console.log('Warning: VERCEL_OIDC_TOKEN is not set. If you intend to use Vercel sandbox, run `npx vercel env pull .env.local` or set USE_LOCAL_JUDGE=true for local runs.');
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
    })
})
.catch((err) => {
    console.log("Mongo DB connection failed!!", err)
});

export { io };
export default app;