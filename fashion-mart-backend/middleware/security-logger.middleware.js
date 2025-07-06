const { logger } = require('../utils/logger');

// Security event logging middleware
const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /vbscript:/i, // VBScript injection
    /onload=/i, // Event handler injection
    /onerror=/i, // Event handler injection
  ];
  
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress;
  const url = req.url;
  const method = req.method;
  
  // Check for suspicious patterns in URL
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(url)) {
      logger.warn('Security Alert: Suspicious request detected', {
        ip,
        userAgent,
        url,
        method,
        pattern: pattern.toString(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Log authentication failures
  res.on('finish', () => {
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn('Authentication/Authorization failure', {
        ip,
        userAgent,
        url,
        method,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  next();
};

module.exports = {
  securityLogger
};
