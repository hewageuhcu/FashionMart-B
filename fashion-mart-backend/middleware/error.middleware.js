// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error (but don't log sensitive information)
  const errorLog = {
    message: err.message,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  // Only log stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorLog.stack = err.stack;
  }
  
  console.error('Error:', errorLog);
  
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  
  // Handle different types of errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'This record already exists';
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference to a foreign key';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'StripeError') {
    statusCode = 400;
    message = err.message;
  } else if (statusCode === 500) {
    // Don't expose internal server errors in production
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal Server Error';
    }
  }
  
  // Send error response
  const errorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
};

// 404 Not Found middleware
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFound
};
