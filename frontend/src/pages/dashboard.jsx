import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MatchmakingUI from '../components/ui/MatchMakingUI';
import { socket } from '../api/socket'; // <-- Use the shared global socket

export default function Dashboard() {
  const [playerStats, setPlayerStats] = useState({ online: 0, playing: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // Ensure the socket connects if it hasn't already
    if (!socket.connected) {
        socket.connect();
    }

    const handleConnectError = (err) => {
      console.error("Socket connection failed:", err.message);
      if (err.message.includes("Unauthorized") || err.message.includes("Invalid")) {
        navigate('/login');
      }
    };

    const handleMatchFound = (data) => {
      console.log("Match found!", data);
      toast.success("Opponent Found! Entering Arena...");
      navigate(`/arena/${data.gameId}`);
    };

    const handlePlayerCountUpdate = (data) => {
      setPlayerStats(data);
    };

    // Attach listeners
    socket.on("connect_error", handleConnectError);
    socket.on("matchFound", handleMatchFound);
    socket.on("playerCountUpdate", handlePlayerCountUpdate);

    // ONLY remove the listeners on unmount. DO NOT disconnect the socket!
    return () => {
      socket.off("connect_error", handleConnectError);
      socket.off("matchFound", handleMatchFound);
      socket.off("playerCountUpdate", handlePlayerCountUpdate);
    };
  }, [navigate]);

  const handleJoinQueue = (constraints) => {
    socket.emit("findMatch", constraints);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">CodeRush Dashboard</h1>
      
      <div className="mb-8 p-4 bg-gray-800 rounded inline-block">
        <p className="text-gray-400">Players Online: <span className="text-white font-bold">{playerStats.online}</span></p>
        <p className="text-gray-400">Players in Match: <span className="text-white font-bold">{playerStats.playing}</span></p>
      </div>

      <MatchmakingUI onJoinQueue={handleJoinQueue} />
    </div>
  );
}