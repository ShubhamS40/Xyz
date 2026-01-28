import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import deviceRoutes from './routes/device/deviceRoutes.js';
import locationRoutes from './routes/location/locationRoutes.js';
import adminRoutes from './routes/admin/adminRoutes.js';
import userRoutes from './routes/user/userRoutes.js';
import TCPServer from './services/tcpServer.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TCP_PORT = process.env.TCP_PORT || 21100;

// Middleware
// CORS configuration - must be before routes
const corsOptions = {
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false,
  optionsSuccessStatus: 200, // Some browsers require 200 instead of 204
  preflightContinue: false
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging - must be after CORS but before routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  // Log CORS preflight requests (but let CORS middleware handle them)
  if (req.method === 'OPTIONS') {
    console.log('  → CORS preflight request');
  }
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'JC261 Tracking Backend API',
    version: '1.0.0',
    endpoints: {
      devices: '/api/devices',
      locations: '/api/locations',
      admin: '/api/admin',
      user: '/api/user',
      health: '/health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes - register before 404 handler
app.use('/api/devices', deviceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);

// Test route to verify server is running
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is working!',
    timestamp: new Date().toISOString(),
    routes: {
      devices: '/api/devices',
      locations: '/api/locations',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});

// 404 handler - must be last, after all routes
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start HTTP Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ HTTP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 External URL: http://${process.env.SERVER_IP || 'YOUR_IP'}:${PORT}/api`);
  console.log(`🖥️  Server IP: ${process.env.SERVER_IP || 'Not configured'}\n`);
});

// Start TCP Server for JC261 devices
const tcpServer = new TCPServer(TCP_PORT);
tcpServer.start();

// Make tcpServer available globally for routes and controllers
global.tcpServer = tcpServer;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (tcpServer) {
    tcpServer.stop();
  }
  process.exit(0);
});