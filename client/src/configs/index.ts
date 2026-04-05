const configs = {
  api_url: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  client_url: process.env.REACT_APP_CLIENT_URL || 'http://localhost:3000',
  node_env: process.env.NODE_ENV || 'development',
  access_token_expiry: (process.env.ACCESS_TOKEN_EXPIRY || '15m') as '15m',
  refresh_token_expiry: (process.env.REFRESH_TOKEN_EXPIRY || '7d') as '7d',
};

export default configs;
