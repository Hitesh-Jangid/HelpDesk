// API Configuration
// Use an explicit override when provided, otherwise default to Render in production and localhost in development.
export const API_BASE_URL =
	import.meta.env.VITE_API_URL ||
	(import.meta.env.PROD ? 'https://helpdesk-2i7q.onrender.com' : 'http://localhost:8000');

console.log('API Base URL:', API_BASE_URL);
