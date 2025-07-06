// Environment variable validation
const validateEnvironment = () => {
  const required = [
    'DB_HOST',
    'DB_USER', 
    'DB_PASSWORD',
    'DB_NAME',
    'CLERK_SECRET_KEY'
  ];
  
  const production = [
    'JWT_SECRET',
    'CLERK_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET'
  ];
  
  const missing = [];
  
  // Check required variables
  required.forEach(env => {
    if (!process.env[env]) {
      missing.push(env);
    }
  });
  
  // Check production-specific variables
  if (process.env.NODE_ENV === 'production') {
    production.forEach(env => {
      if (!process.env[env]) {
        missing.push(env);
      }
    });
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret strength in production
  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      console.warn('WARNING: JWT_SECRET should be at least 32 characters long for production');
    }
  }
  
  console.log('Environment variables validated successfully');
};

module.exports = {
  validateEnvironment
};
