import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import deviceRoutes from './routes/device/deviceRoutes.js';
import locationRoutes from './routes/location/locationRoutes.js';
import adminRoutes from './routes/admin/adminRoutes.js';
import userRoutes from './routes/user/userRoutes.js';
import playbackRoutes from './routes/device/playbackRoutes.js'; // ✅ NEW: Playback routes
import TCPServer from './services/jc261/tcpServer.js';
import JC261PlaybackService from './services/jc261/jc261Playback.js'; // ✅ NEW: Playback service
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Function to start MediaMTX
const startMediaMTX = () => {
  const isWindows = process.platform === 'win32';
  const binaryName = isWindows ? 'mediamtx.exe' : 'mediamtx';
  const mediaMtxPath = path.join(__dirname, 'services', 'jc261', 'mediamtx', binaryName);
  
  if (!fs.existsSync(mediaMtxPath)) {
    console.error(`❌ MediaMTX executable not found at: ${mediaMtxPath}`);
    // Fallback: Check for the other extension just in case
    const altName = isWindows ? 'mediamtx' : 'mediamtx.exe';
    const altPath = path.join(__dirname, 'services', 'jc261', 'mediamtx', altName);
    if (fs.existsSync(altPath)) {
       console.log(`⚠️ Found alternative binary at: ${altPath}`);
       // Use this one instead
       // Recursive call with correct assumption not possible easily here, so just warn user to rename
       console.log(`💡 Please rename it to ${binaryName} or update code.`);
    }
    return;
  }

  console.log(`🚀 Starting MediaMTX...`);
  const mediaMtxProcess = spawn(mediaMtxPath, [], {
    cwd: path.dirname(mediaMtxPath),
    stdio: 'inherit', // Show logs in console
    detached: false
  });

  mediaMtxProcess.on('spawn', () => {
    console.log(`✅ MediaMTX started successfully (PID: ${mediaMtxProcess.pid})`);
  });

  mediaMtxProcess.on('error', (err) => {
    console.error(`❌ Failed to start MediaMTX: ${err.message}`);
  });

  mediaMtxProcess.on('close', (code) => {
    console.log(`⚠️ MediaMTX process exited with code ${code}`);
  });
  
  // Kill MediaMTX when this process exits
  process.on('exit', () => {
    mediaMtxProcess.kill();
  });
};

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
      playback: '/api/playback', // ✅ NEW
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
app.use('/api/playback', playbackRoutes); // ✅ NEW: Playback routes

// Test route to verify server is running
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API is working!',
    timestamp: new Date().toISOString(),
    routes: {
      devices: '/api/devices',
      locations: '/api/locations',
      playback: '/api/playback', // ✅ NEW
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
  
  // Start MediaMTX
  startMediaMTX();
});

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ PLAYBACK SERVICE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

// Start TCP Server for JC261 devices
const tcpServer = new TCPServer(TCP_PORT);
tcpServer.start();

// ✅ Initialize Playback Service
console.log('🎬 Initializing JC261 Playback Service...');
const playbackService = new JC261PlaybackService(
  tcpServer.calculateCRC.bind(tcpServer),
  tcpServer.jc261Handler
);
console.log('✅ Playback Service initialized\n');

// ✅ Make services available to routes via app.set()
app.set('tcpServer', tcpServer);
app.set('playbackService', playbackService);

// Make tcpServer available globally for routes and controllers (for backward compatibility)
global.tcpServer = tcpServer;
global.playbackService = playbackService; // ✅ NEW: Also make playback service global

// ✅ Cleanup old playback sessions every 30 minutes
setInterval(() => {
  playbackService.cleanupOldSessions(30);
}, 30 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  if (tcpServer) {
    tcpServer.stop();
  }
  process.exit(0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ PLAYBACK USAGE INFORMATION
// ═══════════════════════════════════════════════════════════════════════════════
console.log('┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
console.log('┃              JC261 PLAYBACK SERVICE READY                          ┃');
console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');
console.log('');
console.log('📹 Playback Endpoints:');
console.log('   POST   /api/playback/request-list/:imei  - Request video list');
console.log('   GET    /api/playback/videos/:imei        - Get available videos');
console.log('   POST   /api/playback/start/:imei         - Start playback');
console.log('   POST   /api/playback/stop/:imei          - Stop playback');
console.log('   POST   /api/playback/video-list          - Device callback (auto)');
console.log('');
console.log('🔗 Device will POST video list to:');
console.log(`   http://${process.env.HTTP_PUBLIC_HOST}:${process.env.HTTP_PUBLIC_PORT}/api/playback/video-list`);
console.log('');
console.log('📺 Stream URLs (after playback starts):');
console.log('   RTMP:     rtmp://localhost:1936/live/{imei}');
console.log('   HTTP-FLV: http://localhost:8888/live/{imei}.flv');
console.log('   HLS:      http://localhost:8888/live/{imei}/hls.m3u8');
console.log('');
console.log('💡 Quick Test:');
console.log('   curl -X POST http://localhost:5000/api/playback/request-list/864993060968006');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');