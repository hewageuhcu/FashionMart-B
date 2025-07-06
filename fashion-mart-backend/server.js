const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const morgan = require('morgan');
const dotenv = require('dotenv');
// Load environment variables
dotenv.config();

// Validate environment variables
const { validateEnvironment } = require('./utils/env-validator');
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error.message);
  process.exit(1);
}

const path = require('path');
const { errorHandler, notFound } = require('./middleware/error.middleware');
const { sanitizeInput } = require('./middleware/sanitize.middleware');
const { securityLogger } = require('./middleware/security-logger.middleware');
const { logger, stream } = require('./utils/logger');
const routes = require('./routes');
const db = require('./models');

// Initialize express app
const app = express();

// Set up middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
})); // Enhanced security headers
app.use(cors({
  origin: process.env.CLIENT_URL || false, // Only allow specific origins, no wildcard
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  credentials: true // Allow credentials to be sent with requests
}));
app.use(express.json({ limit: '10mb' })); // Parse JSON request body with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded request body with size limit

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiter
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: () => 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 20000, // maximum delay of 20 seconds
  validate: { delayMs: false } // disable the warning message
});

app.use('/api/', limiter);
app.use('/api/', speedLimiter);

// Input sanitization
app.use(sanitizeInput);

// Security logging
app.use(securityLogger);

app.use(morgan('combined', { stream })); // HTTP request logging

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// API routes
app.use('/api', routes);

// Error handling middleware
app.use(notFound); // 404 Not Found
app.use(errorHandler); // Global error handler

// Set port
const PORT = process.env.PORT || 5000;

// Sync database and start server
const startServer = async () => {
  try {
    // Test database connection first
    await db.sequelize.authenticate();
    logger.info('Database connection has been established successfully');
    
    // Check if tables exist before syncing
    const [results] = await db.sequelize.query(
      "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'fashionmart' AND TABLE_NAME = 'users'"
    );
    
    const tablesExist = results[0].count > 0;
    
    if (!tablesExist) {
      // Only sync if tables don't exist
      logger.info('Tables do not exist, creating them...');
      await db.sequelize.sync({ force: false });
      logger.info('Database tables created successfully');
    } else {
      logger.info('Tables already exist, skipping sync to avoid key conflicts');
    }
    
    logger.info('Database connected and ready');
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();