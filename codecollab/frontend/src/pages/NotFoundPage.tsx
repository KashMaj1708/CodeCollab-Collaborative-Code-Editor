import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-xl mb-4">Page Not Found</p>
      <Link to="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md">
        Go Home
      </Link>
    </div>
  );
}