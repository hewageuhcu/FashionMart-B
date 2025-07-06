const xss = require('xss');

// Sanitize input data to prevent XSS attacks
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return xss(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

module.exports = {
  sanitizeInput
};
