const jwt = require('jsonwebtoken');
const Employee = require('../models/Employee');

const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      let token;

      // First check Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      // Fallback to x-auth-token header
      if (!token && req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'];
      }

      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      const employee = await Employee.findById(decoded.id);
      if (!employee) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (allowedRoles.length && !allowedRoles.includes(employee.designation)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      req.user = employee;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  };
};

module.exports = authMiddleware;