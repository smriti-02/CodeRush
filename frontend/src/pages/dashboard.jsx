import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MatchmakingUI from '../components/ui/MatchMakingUI';

export default function Dashboard() {
  const [socket, setSocket] = useState(null);
  const [playerStats, setPlayerStats] = useState({ online: 0, playing: 0 });
  
  const navigate = useNavigate();

  useEffect(() => {
    const newSocket = io("http://localhost:8000", {
      withCredentials: true, 
    });

    newSocket.on("connect", () => {});

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
      if (err.message.includes("Unauthorized") || err.message.includes("Invalid")) {
        navigate('/login');
      }
    });

    newSocket.on("matchFound", (data) => {
      console.log("Match found!", data);
      toast.success("Opponent Found! Entering Arena...");
      navigate(`/arena/${data.gameId}`);
    });

    newSocket.on("playerCountUpdate", (data) => {
      setPlayerStats(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  
  const handleJoinQueue = (constraints) => {
    if (socket) {
      socket.emit("findMatch", constraints);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">CodeRush Dashboard</h1>
      
      <div className="mb-8 p-4 bg-gray-800 rounded inline-block">
        <p className="text-gray-400">Players Online: <span className="text-white font-bold">{playerStats.online}</span></p>
        <p className="text-gray-400">Players in Match: <span className="text-white font-bold">{playerStats.playing}</span></p>
      </div>

      {/* Replaced the hardcoded button with the new component */}
      <MatchmakingUI onJoinQueue={handleJoinQueue} />
    </div>
  );
}