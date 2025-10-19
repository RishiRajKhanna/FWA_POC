// API configuration
const API_CONFIG = {
  // Base URL for API requests
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'http://your-production-domain.com/api' 
    : 'http://localhost:5001/api',
  
  // API endpoints
  ENDPOINTS: {
    HEALTH: '/health',
    UPLOAD: '/upload',
    ANALYZE: '/analyze',
    SCENARIOS: '/scenarios'
  },

  // Request timeout in milliseconds
  TIMEOUT: 30000
};

export default API_CONFIG;