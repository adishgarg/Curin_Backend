const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  // Enforce HTTPS in production
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'];
    if (req.secure || proto === 'https') return next();
    return res.redirect(`https://${req.headers.host}${req.url}`);
  });
  // Enable HSTS
  app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true }));
}

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001']; // Frontend ports

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies and credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count'], // Headers accessible to frontend
    maxAge: 86400 // Cache preflight requests for 24 hours
  })
);
// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1)
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Import routes
const employeeRoutes = require('./Controllers/employee.js');
const loginRoutes = require('./Controllers/login.js');
const organizationRoutes = require('./Controllers/organizaiton.js');
const taskRoutes = require('./Controllers/Task.js');
const industriesRoutes = require('./Controllers/industries.js');
const fileRoutes = require('./Controllers/files.js');
const authRoutes = require('./Controllers/auth.js');
const eventRoutes = require('./Controllers/events.js');
// API Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/auth', loginRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/industries', industriesRoutes);
app.use('/api/files', fileRoutes);
app.use('/auth', authRoutes);
app.use('/api/events', eventRoutes);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
