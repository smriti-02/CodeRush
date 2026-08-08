import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from './routes/user.routes.js';
import "./config/passport.js";
import helmet from 'helmet';
import gameRouter from "./routes/game.routes.js";
import judgeRouter from "./routes/judge.routes.js";
import aiRouter from "./routes/ai.routes.js";


const app = express();

app.use(cors(
  {
    origin: process.env.CORS_ORIGIN,
    credentials: true
  }
));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],

        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "http://localhost:5173",
          "https://code-rush-vosk.vercel.app",
          "https://cdn.jsdelivr.net" // REQUIRED FOR MONACO
        ],

        "connect-src": [
          "'self'",
          "http://localhost:8000",
          "ws://localhost:5173",
          "http://localhost:5173",
          "https://code-rush-vosk.vercel.app",
          "wss://code-rush-vosk.vercel.app",
          "https://accounts.google.com",
          "https://github.com"
        ],

        "img-src": [
          "'self'",
          "data:",
          "http://localhost:5173",
          "https://lh3.googleusercontent.com",
          "https://code-rush-vosk.vercel.app",
          "https://avatars.githubusercontent.com"
        ],

        "style-src": [
          "'self'",
          "'unsafe-inline'",
          "http://localhost:5173",
          "https://code-rush-vosk.vercel.app"
        ],

        // REQUIRED FOR MONACO SYNTAX HIGHLIGHTING
        "worker-src": [
          "'self'",
          "blob:",
          "https://cdn.jsdelivr.net"
        ],

        // REQUIRED FOR MONACO ICONS
        "font-src": [
          "'self'",
          "data:",
          "https://cdn.jsdelivr.net"
        ],

        "upgrade-insecure-requests": null,
      },
    },
  })
);
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/v1/users", userRouter);
app.use("/api/v1/games", gameRouter);
app.use("/api/v1/judge", judgeRouter);
app.use("/api/v1/ai", aiRouter);



export default app;