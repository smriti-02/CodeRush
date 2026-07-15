import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import MatchmakingUI from '../components/ui/MatchMakingUI';
import { socket } from '../api/socket';

export default function Dashboard() {
  const [playerStats, setPlayerStats] = useState({ online: 0, playing: 0 });
  const [proposal, setProposal] = useState(null); // Tracks the pending match
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleMatchFound = (data) => {
      setProposal(null); // Close modal
      toast.success("Entering Arena...");
      navigate(`/arena/${data.gameId}`);
    };

    // Listeners for the proposal logic
    const handleMatchProposed = (data) => {
      console.log("Match proposed!", data);
      setProposal(data);
    };

    const handleProposalDeclined = (data) => {
      setProposal(null);
      toast.error(data.message || "Match declined. Back in queue.");
    };

    socket.on("matchFound", handleMatchFound);
    socket.on("matchProposed", handleMatchProposed);
    socket.on("proposalDeclined", handleProposalDeclined);
    socket.on("playerCountUpdate", setPlayerStats);

    return () => {
      socket.off("matchFound", handleMatchFound);
      socket.off("matchProposed", handleMatchProposed);
      socket.off("proposalDeclined", handleProposalDeclined);
      socket.off("playerCountUpdate", setPlayerStats);
    };
  }, [navigate]);

  const handleJoinQueue = (constraints) => {
    socket.emit("findMatch", constraints);
    toast.success("Joined matchmaking queue...");
  };

  const acceptProposal = () => {
    socket.emit("acceptProposal", { proposalId: proposal.proposalId });
    toast.success("Accepted! Waiting for opponent...");
  };

  const rejectProposal = () => {
    socket.emit("rejectProposal", { proposalId: proposal.proposalId });
    setProposal(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative">
      <h1 className="text-3xl font-bold mb-4">CodeRush Dashboard</h1>
      
      <div className="mb-8 p-4 bg-gray-800 rounded inline-block">
        <p className="text-gray-400">Online: <span className="text-white font-bold">{playerStats.online}</span> | Playing: <span className="text-white font-bold">{playerStats.playing}</span></p>
      </div>

      <MatchmakingUI onJoinQueue={handleJoinQueue} />

      {/* THE PROPOSAL MODAL */}
      {proposal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full shadow-2xl border border-blue-500/30">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Compromise Match Found</h2>
            <p className="text-sm text-gray-300 mb-4">
              We couldn't find an exact match. Do you accept these settings?
            </p>
            <div className="bg-gray-900 p-4 rounded mb-6 font-mono text-sm space-y-2">
              <p><span className="text-gray-500">Topic:</span> <span className="text-blue-400">{proposal.config.topic}</span></p>
              <p><span className="text-gray-500">Time:</span> <span className="text-green-400">{proposal.config.timeLimit} mins</span></p>
              <p><span className="text-gray-500">Difficulty:</span> <span className="text-red-400">{proposal.config.difficulty}</span></p>
            </div>
            <div className="flex gap-4">
              <button onClick={rejectProposal} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded">
                Decline
              </button>
              <button onClick={acceptProposal} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded">
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}