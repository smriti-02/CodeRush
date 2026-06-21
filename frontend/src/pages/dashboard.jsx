import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate

export default function Dashboard() {
  const [socket, setSocket] = useState(null);
  const [playerStats, setPlayerStats] = useState({ online: 0, playing: 0 });
  
  const navigate = useNavigate(); // 2. Initialize the hook

  useEffect(() => {
    const newSocket = io("http://localhost:8000", {
      withCredentials: true, 
    });

    newSocket.on("connect", () => {
      console.log("Connected securely with ID:", newSocket.id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
      
      // 3. Trigger the redirect if the backend throws an unauthorized error
      if (err.message.includes("Unauthorized") || err.message.includes("Invalid")) {
        navigate('/login');
      }
    });

    newSocket.on("playerCountUpdate", (data) => {
      setPlayerStats(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]); // Add navigate to the dependency array

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">CodeRush Dashboard</h1>
      
      <div className="mb-8 p-4 bg-gray-800 rounded">
        <p>Players Online: {playerStats.online}</p>
        <p>Players in Match: {playerStats.playing}</p>
      </div>

      <button 
        onClick={() => socket?.emit("joinGame", "test-room")}
        className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
      >
        Find Match
      </button>
    </div>
  );
}