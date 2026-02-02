import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRouter from './routes/user.routes.js';
import "./config/Passport.js";
import helmet from 'helmet';

const app = express();

app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,
        credentials: true
    }
));
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/v1/users", userRouter);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        // Allow the site to load its own basic resources
        "default-src": ["'self'"],
        
        // Allow scripts from your frontend dev server (Vite)
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:5173"],
        
        // Allow connections to your backend, Vite WebSockets, and OAuth providers
        "connect-src": [
          "'self'", 
          "http://localhost:8000", 
          "ws://localhost:5173", 
          "http://localhost:5173",
          "https://accounts.google.com", 
          "https://github.com"
        ],
        
        // Allow images from Vite and OAuth providers
        "img-src": [
          "'self'", 
          "data:", 
          "http://localhost:5173",
          "https://lh3.googleusercontent.com", 
          "https://avatars.githubusercontent.com"
        ],
        
        // Allow styles from Vite
        "style-src": ["'self'", "'unsafe-inline'", "http://localhost:5173"],
        
        "upgrade-insecure-requests": null,
      },
    },
  })
);


export {app}