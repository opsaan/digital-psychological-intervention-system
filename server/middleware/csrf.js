const crypto = require('crypto');

const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret';

const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const validateCSRFToken = (token, secret = CSRF_SECRET) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Simple CSRF token validation
  // In production, use more sophisticated token generation and validation
  return token.length === 64 && /^[a-f0-9]+$/i.test(token);
};

const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests and health checks
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path === '/health') {
    return next();
  }
  
  // Skip CSRF for auth login/register (handled separately)
  if (req.path.includes('/auth/login') || req.path.includes('/auth/register')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!validateCSRFToken(token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
};

const getCSRFToken = (req, res) => {
  const token = generateCSRFToken();
  res.json({ csrfToken: token });
};

module.exports = {
  csrfProtection,
  getCSRFToken,
  generateCSRFToken,
  validateCSRFToken
};