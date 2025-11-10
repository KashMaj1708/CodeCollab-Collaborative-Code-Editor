import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ roomId: string }>('/api/rooms');
      const { roomId } = response.data;
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Error: Could not create a new room. Please try again.');
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      navigate(`/room/${joinRoomId.trim()}`);
    }
  };

  return (
    // --- UI REVAMP ---
    // Mimicking Cluely's gradient and centered layout
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 text-gray-900 p-6">
      {/* Background blur effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 flex flex-col items-center justify-center max-w-2xl text-center p-8 bg-white/70 backdrop-blur-md rounded-3xl shadow-xl">
        <h1 className="text-6xl md:text-7xl font-extrabold mb-4 text-gray-900 leading-tight">
          CodeCollab
        </h1>
        <p className="text-2xl mb-8 text-gray-700 font-medium">
          Real-time collaborative code editor. Build, test, and share code seamlessly with your team.
        </p>

        {/* Create Room Button */}
        <div className="mb-6 w-full max-w-sm">
          <button
            onClick={handleCreateRoom}
            disabled={isLoading}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-bold rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating Room...' : 'Create New Room'}
          </button>
        </div>

        <div className="text-gray-500 my-4 text-lg">--- OR ---</div>

        {/* Join Room Form */}
        <form onSubmit={handleJoinRoom} className="flex flex-col items-center w-full max-w-sm">
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Enter Room ID..."
            className="w-full px-6 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg mb-3 shadow-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !joinRoomId.trim()}
            className="w-full px-8 py-3 bg-gray-200 text-gray-800 text-lg font-semibold rounded-xl shadow-md hover:bg-gray-300 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
}