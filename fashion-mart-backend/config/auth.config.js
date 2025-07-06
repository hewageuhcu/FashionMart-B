module.exports = {
  // Clerk secret key for API authentication
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  // Clerk webhook secret for webhook verification
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  // JWT secret for internal token generation (used as backup or for special cases)
  jwtSecret: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    console.warn('WARNING: Using default JWT secret. Set JWT_SECRET environment variable for production.');
    return 'fashionmart-jwt-secret-key-change-in-production';
  })(),
  // JWT expiration time
  jwtExpiration: 86400, // 24 hours in seconds
};