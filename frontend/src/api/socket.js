import { io } from "socket.io-client";

// Get the backend URL and strip the /api/v1 path if it exists, so Socket.io connects to the root namespace
const rawUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"; 
const backendUrl = rawUrl.replace(/\/api\/v1\/?$/, "");

export const socket = io(backendUrl, {
  withCredentials: true, 
  // autoConnect: true is the default, which is fine for now
});