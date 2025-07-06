// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return emailRegex.test(email);
};

// Password validation (minimum 8 characters, at least one letter and one number)
const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

// Phone number validation (simple format - can be expanded as needed)
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(phone);
};

// UUID validation
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Decimal validation (for prices, etc.)
const isValidDecimal = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

// Date validation (ISO format)
const isValidDate = (date) => {
  return !isNaN(Date.parse(date));
};

// Object ID validation (for MongoDB, if used)
const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidUUID,
  isValidDecimal,
  isValidDate,
  isValidObjectId
};