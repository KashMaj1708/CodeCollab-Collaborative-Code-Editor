import axios from 'axios';

// Get the backend URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
});

export default apiClient;