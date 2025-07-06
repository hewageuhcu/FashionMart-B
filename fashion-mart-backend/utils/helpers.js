const crypto = require('crypto');
const moment = require('moment');

// Generate a random string of specified length
const generateRandomString = (length = 10) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Format date
const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

// Paginate results
const paginate = (items, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedItems = items.slice(offset, offset + limit);
  const totalPages = Math.ceil(items.length / limit);
  
  return {
    items: paginatedItems,
    meta: {
      totalItems: items.length,
      itemsPerPage: limit,
      currentPage: page,
      totalPages
    }
  };
};

// Calculate order total
const calculateOrderTotal = (items) => {
  return items.reduce((total, item) => {
    return total + (parseFloat(item.price) * item.quantity);
  }, 0);
};

// Generate a slug from a string
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Mask sensitive data (e.g., credit card numbers)
const maskSensitiveData = (data, start = 0, end = 4, maskChar = '*') => {
  if (!data) return '';
  
  const dataStr = data.toString();
  const visibleStart = dataStr.slice(0, start);
  const visibleEnd = dataStr.slice(-end);
  const maskedLength = dataStr.length - start - end;
  
  if (maskedLength <= 0) {
    return dataStr;
  }
  
  const maskedPart = maskChar.repeat(maskedLength);
  return `${visibleStart}${maskedPart}${visibleEnd}`;
};

module.exports = {
  generateRandomString,
  formatCurrency,
  formatDate,
  paginate,
  calculateOrderTotal,
  slugify,
  maskSensitiveData
};