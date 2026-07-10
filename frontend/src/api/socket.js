import { io } from "socket.io-client";

// Update the port to match whatever your Node backend is running on (e.g., 5000 or 8000)
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000"; 

export const socket = io(backendUrl, {
  withCredentials: true, 
  // autoConnect: true is the default, which is fine for now
});