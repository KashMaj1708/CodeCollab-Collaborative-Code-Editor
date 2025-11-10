import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../apiClient';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      // Call the backend endpoint
      const response = await apiClient.post<{ roomId: string }>('/api/rooms');
      const { roomId } = response.data;

      // Redirect to the new room
      navigate(`/room/${roomId}`);

    } catch (error) {
      console.error('Failed to create room:', error);
      alert('Error: Could not create a new room. Please try again.');
      setIsLoading(false);
    }
    // We don't need to setIsLoading(false) on success
    // because the component will unmount on navigation.
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-8">CodeCollab</h1>
      <div className="space-x-4">
        <button
          onClick={handleCreateRoom}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors disabled:bg-gray-500"
        >
          {isLoading ? 'Creating...' : 'Create Room'}
        </button>
        <button 
          disabled={isLoading}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-800 rounded-md font-semibold transition-colors disabled:opacity-50"
        >
          Join Room
        </button>
      </div>
    </div>
  );
}