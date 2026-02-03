/**
 * ✅ ENHANCED JC261 PLAYBACK ROUTES - SUPPORTS MANUAL UPLOAD
 * 🔍 WITH COMPREHENSIVE DEBUG LOGGING
 * 
 * NEW FEATURES:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1. Manual fileinfo.fjson upload endpoint
 * 2. Support for .ts video files
 * 3. Parsed video metadata with camera type
 * 4. Better error diagnostics
 * 5. 🔍 DEBUG LOGGING to track HTTP POST issues
 */

import express from 'express';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * ✅ ENDPOINT TO RECEIVE VIDEO LIST FROM DEVICE
 * POST /api/playback/video-list
 * 
 * 🔍 WITH DEBUG LOGGING TO TRACK IF ENDPOINT IS CALLED
 */
router.post('/video-list', async (req, res) => {
  // 🔍 DEBUG: Log that endpoint was hit
  console.log('\n' + '🎯'.repeat(40));
  console.log('🎯 HTTP POST RECEIVED AT /api/playback/video-list');
  console.log('🎯 Timestamp:', new Date().toISOString());
  console.log('🎯 IP Address:', req.ip || req.connection?.remoteAddress);
  console.log('🎯 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🎯 Request Body Type:', typeof req.body);
  console.log('🎯 Request Body Keys:', Object.keys(req.body || {}));
  console.log('🎯 Request Body:', JSON.stringify(req.body, null, 2).substring(0, 500));
  console.log('🎯'.repeat(40) + '\n');
  
  try {
    console.log('\n' + '🔔'.repeat(40));
    console.log('📥 DEVICE POSTED VIDEO LIST!');
    console.log('🔔'.repeat(40));
    
    const { imei, fileNameList } = req.body;
    
    console.log(`🔍 DEBUG - Extracted values:`);
    console.log(`   IMEI: ${imei}`);
    console.log(`   fileNameList type: ${typeof fileNameList}`);
    console.log(`   fileNameList length: ${fileNameList?.length || 0}`);
    console.log(`   fileNameList preview: ${typeof fileNameList === 'string' ? fileNameList.substring(0, 200) : JSON.stringify(fileNameList)?.substring(0, 200)}`);
    
    if (!imei || !fileNameList) {
      console.error('❌ Missing imei or fileNameList in request');
      console.error(`   imei present: ${!!imei}`);
      console.error(`   fileNameList present: ${!!fileNameList}`);
      console.error(`   Full body:`, JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        code: 400,
        ok: false,
        msg: 'Missing required fields: imei and fileNameList'
      });
    }
    
    console.log(`📱 IMEI: ${imei}`);
    console.log(`📄 File List Length: ${fileNameList.length} chars`);
    
    const playbackService = req.app.get('playbackService');
    
    if (!playbackService) {
      console.error('❌ Playback service not initialized!');
      return res.status(500).json({
        code: 500,
        ok: false,
        msg: 'Playback service not available'
      });
    }
    
    console.log(`🔍 Calling playbackService.handleVideoListFromDevice...`);
    const result = playbackService.handleVideoListFromDevice(imei, fileNameList);
    console.log(`✅ handleVideoListFromDevice returned:`, result);
    
    console.log('✅ Video list stored successfully');
    console.log('🔔'.repeat(40) + '\n');
    
    return res.json({
      code: 0,
      ok: true
    });
    
  } catch (error) {
    console.error('❌ Error handling video list:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({
      code: 500,
      ok: false,
      msg: error.message
    });
  }
});

/**
 * ✅ NEW: MANUAL FILE UPLOAD ENDPOINT
 * POST /api/playback/upload-filelist/:imei
 * 
 * Use this when device doesn't HTTP POST but creates fileinfo.fjson on SD card
 * 
 * Usage:
 * 1. Get fileinfo.fjson from device SD card
 * 2. Upload it here with IMEI
 * 3. Server will parse and filter videos
 */
router.post('/upload-filelist/:imei', upload.single('filelist'), async (req, res) => {
  try {
    const { imei } = req.params;
    const file = req.file;
    
    console.log(`\n🔍 Manual upload endpoint hit for IMEI: ${imei}`);
    console.log(`   File present: ${!!file}`);
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload fileinfo.fjson from device SD card'
      });
    }
    
    console.log('\n' + '📤'.repeat(40));
    console.log('📥 MANUAL FILELIST UPLOAD');
    console.log('📤'.repeat(40));
    console.log(`📱 IMEI: ${imei}`);
    console.log(`📁 File: ${file.originalname}`);
    console.log(`📏 Size: ${file.size} bytes`);
    
    const playbackService = req.app.get('playbackService');
    
    if (!playbackService) {
      return res.status(500).json({
        success: false,
        error: 'Playback service not available'
      });
    }
    
    // Convert buffer to string
    const fileContent = file.buffer.toString('utf-8');
    console.log(`📄 File content preview: ${fileContent.substring(0, 200)}...`);
    
    // Process the file list
    const result = playbackService.handleVideoListFromDevice(imei, fileContent);
    
    // Get the processed results
    const videoList = playbackService.getVideoList(imei);
    const parsedList = playbackService.getParsedVideoList(imei);
    const session = playbackService.getSession(imei);
    
    console.log('✅ File processed successfully');
    console.log(`📹 Found ${videoList.length} videos`);
    console.log('📤'.repeat(40) + '\n');
    
    return res.json({
      success: true,
      message: 'File list uploaded and processed successfully',
      imei,
      totalVideos: videoList.length,
      videos: parsedList.map(v => ({
        filename: v.filename,
        camera: v.cameraType,
        channel: v.channel,
        recorded: v.videoDate.toISOString(),
        format: v.extension
      })),
      session: session ? {
        status: session.status,
        filterRange: `${session.startTime} - ${session.endTime}`,
        totalVideos: session.totalVideos,
        filteredVideos: session.filteredVideos
      } : null,
      nextSteps: [
        'Videos are now available for playback',
        `GET /api/playback/videos/${imei} to see full list`,
        `POST /api/playback/start/${imei} with videoName to start playback`,
        'Note: If video is not in list, use "force": true in body to bypass check.'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error uploading file list:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📋 GET VIDEO LIST FOR A DEVICE (ENHANCED)
 * GET /api/playback/videos/:imei
 */
router.get('/videos/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
    const { parsed = 'false' } = req.query;
    
    console.log(`\n🔍 GET /videos/${imei} requested (parsed=${parsed})`);
    
    const playbackService = req.app.get('playbackService');
    
    if (!playbackService) {
      return res.status(500).json({
        success: false,
        error: 'Playback service not available'
      });
    }
    
    const videoList = playbackService.getVideoList(imei);
    const parsedList = playbackService.getParsedVideoList(imei);
    const session = playbackService.getSession(imei);
    
    console.log(`   Videos found: ${videoList.length}`);
    console.log(`   Parsed videos: ${parsedList.length}`);
    
    // Return parsed list if requested
    if (parsed === 'true' && parsedList.length > 0) {
      return res.json({
        success: true,
        imei,
        count: parsedList.length,
        videos: parsedList.map(v => ({
          filename: v.filename,
          camera: v.cameraType,
          channel: v.channel,
          channelCode: v.channelCode,
          recorded: v.videoDate.toISOString(),
          timestamp: v.timestamp,
          format: v.extension,
          year: v.year,
          month: v.month,
          day: v.day,
          hour: v.hour,
          minute: v.minute,
          second: v.second
        })),
        session: session,
        filterInfo: session ? {
          total: session.totalVideos,
          filtered: session.filteredVideos,
          removed: (session.totalVideos || 0) - (session.filteredVideos || 0),
          startTime: session.startTime,
          endTime: session.endTime
        } : null
      });
    }
    
    // Return simple list (backward compatible)
    return res.json({
      success: true,
      imei,
      videos: videoList,
      count: videoList.length,
      session: session,
      filtered: session?.filteredVideos !== session?.totalVideos,
      filterInfo: session ? {
        total: session.totalVideos,
        filtered: session.filteredVideos,
        removed: (session.totalVideos || 0) - (session.filteredVideos || 0),
        startTime: session.startTime,
        endTime: session.endTime
      } : null,
      hint: videoList.length === 0 ? 
        'No videos found. Try: (1) POST /request-list/:imei to request from device, (2) POST /upload-filelist/:imei to upload fileinfo.fjson manually' : 
        null,
      parsedDataAvailable: parsedList.length > 0,
      tip: parsedList.length > 0 ? 'Add ?parsed=true to get detailed video metadata' : null
    });
    
  } catch (error) {
    console.error('Error getting video list:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🎬 REQUEST VIDEO LIST FROM DEVICE
 * POST /api/playback/request-list/:imei
 */
router.post('/request-list/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
    let { startTime, endTime, useTFCard = true } = req.body;
    
    console.log(`\n🔍 POST /request-list/${imei} received`);
    console.log(`   startTime: ${startTime}`);
    console.log(`   endTime: ${endTime}`);
    console.log(`   useTFCard: ${useTFCard}`);

    // If no dates provided, use last 24 hours
    if (!startTime || !endTime) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Format: YYMMDDHHMMSS
      const formatTime = (d) => {
        return d.getFullYear().toString().substring(2) +
          (d.getMonth() + 1).toString().padStart(2, '0') +
          d.getDate().toString().padStart(2, '0') +
          d.getHours().toString().padStart(2, '0') +
          d.getMinutes().toString().padStart(2, '0') +
          d.getSeconds().toString().padStart(2, '0');
      };
      
      startTime = formatTime(yesterday);
      endTime = formatTime(now);
      console.log(`   Defaulting to last 24h: ${startTime} - ${endTime}`);
    }

    const playbackService = req.app.get('playbackService');
    const tcpServer = req.app.get('tcpServer');
    
    if (!playbackService || !tcpServer) {
      return res.status(500).json({
        success: false,
        error: 'Services not available'
      });
    }

    const activeConnections = tcpServer.activeConnections;
    const result = await playbackService.requestVideoList(
      imei,
      'http://159.223.171.199:41379/api/playback/request-all/' + imei, // Use the new endpoint
      startTime,
      endTime,
      activeConnections,
      useTFCard
    );

    return res.json(result);

  } catch (error) {
    console.error('Error requesting video list:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ✅ NEW: VENDOR SPECIFIC CALLBACK ENDPOINT
 * POST /api/playback/request-all/:imei
 * 
 * This is the endpoint the device/vendor uses to upload the file list.
 * It matches the user's specific requirement.
 */
router.post('/request-all/:imei', async (req, res) => {
  // 🔍 DEBUG: Log that endpoint was hit
  console.log('\n' + '🎯'.repeat(40));
  console.log('🎯 HTTP POST RECEIVED AT /api/playback/request-all/:imei');
  console.log(`🎯 IMEI from URL: ${req.params.imei}`);
  console.log('🎯 Timestamp:', new Date().toISOString());
  console.log('🎯 IP Address:', req.ip || req.connection?.remoteAddress);
  console.log('🎯 Request Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🎯 Request Body Type:', typeof req.body);
  console.log('🎯 Request Body:', JSON.stringify(req.body, null, 2).substring(0, 500));
  console.log('🎯'.repeat(40) + '\n');
  
  try {
    const { imei: imeiFromParams } = req.params;
    const { imei: imeiFromBody, fileNameList } = req.body;
    
    // Use IMEI from params if available, otherwise from body
    const imei = imeiFromParams || imeiFromBody;
    
    if (!imei || !fileNameList) {
      console.error('❌ Missing imei or fileNameList in request');
      return res.status(400).json({
        code: 400,
        ok: false,
        msg: 'Missing required fields'
      });
    }
    
    const playbackService = req.app.get('playbackService');
    
    if (!playbackService) {
      console.error('❌ Playback service not initialized!');
      return res.status(500).json({
        code: 500,
        ok: false,
        msg: 'Playback service not available'
      });
    }
    
    // Process the list
    const result = playbackService.handleVideoListFromDevice(imei, fileNameList);
    
    console.log('✅ Video list received and processed via request-all');
    
    // 🚨 CRITICAL: Return exactly what the device expects
    return res.json({
      code: 0,
      ok: true
    });
    
  } catch (error) {
    console.error('❌ Error handling video list:', error);
    return res.status(500).json({
      code: 500,
      ok: false,
      msg: error.message
    });
  }
});

// Helper function
function formatJC261Time(date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${min}${sec}`;
}

/**
 * ▶️ START PLAYBACK
 * POST /api/playback/start/:imei
 */
router.post('/start/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
    const { videoName, force = false } = req.body;
    
    console.log(`\n🔍 POST /start/${imei} received`);
    console.log(`   videoName: ${videoName}`);
    console.log(`   force: ${force}`);
    
    if (!videoName) {
      return res.status(400).json({
        success: false,
        error: 'videoName is required'
      });
    }
    
    const tcpServer = req.app.get('tcpServer');
    const playbackService = req.app.get('playbackService');
    
    if (!tcpServer || !playbackService) {
      return res.status(500).json({
        success: false,
        error: 'Required services not available'
      });
    }
    
    const result = await playbackService.startPlayback(
      imei,
      videoName,
      tcpServer.activeConnections,
      force
    );
    
    // Add Postman visualization hint
    if (result.success && result.url) {
      result.postman_hint = 'Use the "Visualize" tab in Postman or open the URL in VLC.';
    }
    
    return res.json(result);
    
  } catch (error) {
    console.error('Error starting playback:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ⏹️ STOP PLAYBACK
 * POST /api/playback/stop/:imei
 */
router.post('/stop/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
    
    console.log(`\n🔍 POST /stop/${imei} received`);
    
    const tcpServer = req.app.get('tcpServer');
    const playbackService = req.app.get('playbackService');
    
    if (!tcpServer || !playbackService) {
      return res.status(500).json({
        success: false,
        error: 'Required services not available'
      });
    }
    
    const success = await playbackService.stopPlayback(
      imei,
      tcpServer.activeConnections
    );
    
    return res.json({
      success,
      message: success ? 'Playback stopped' : 'Failed to stop playback'
    });
    
  } catch (error) {
    console.error('Error stopping playback:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ✅ REQUEST ALL VIDEOS
 * POST /api/playback/request-all/:imei
 */
router.post('/request-all/:imei', async (req, res) => {
  try {
    const { imei } = req.params;
    const { useTFCard = true } = req.body;
    
    console.log(`\n🔍 POST /request-all/${imei} received`);
    
    const now = new Date();
    const tenYearsAgo = new Date(now.getFullYear() - 10, 0, 1, 0, 0, 0);
    const nextYear = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59);
    
    const startTime = formatJC261Time(tenYearsAgo);
    const endTime = formatJC261Time(nextYear);
    
    console.log(`📋 Requesting ALL videos for ${imei}`);
    
    const tcpServer = req.app.get('tcpServer');
    const playbackService = req.app.get('playbackService');
    
    if (!tcpServer || !playbackService) {
      return res.status(500).json({
        success: false,
        error: 'Required services not available'
      });
    }
    
    const publicHost = process.env.HTTP_PUBLIC_HOST || 'localhost';
    const publicPort = process.env.HTTP_PUBLIC_PORT || '5000';
    const baseUrl = `http://${publicHost}:${publicPort}/api/playback/video-list`;
    
    const result = await playbackService.requestVideoList(
      imei,
      baseUrl,
      startTime,
      endTime,
      tcpServer.activeConnections,
      useTFCard
    );
    
    if (result.success) {
      result.filtering = 'NONE - returning ALL videos';
      result.getAllVideos = true;
      result.alternativeMethod = {
        description: 'If device doesn\'t POST, manually upload fileinfo.fjson',
        endpoint: `/api/playback/upload-filelist/${imei}`,
        method: 'POST',
        fileLocation: 'Device SD card: /storage/sdcard0/DVRMEDIA/CarRecorder/GENERAL/fileinfo.fjson'
      };
    }
    
    return res.json(result);
    
  } catch (error) {
    console.error('Error requesting all videos:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🛠️ HELPER: Generate time range
 * GET /api/playback/time-helper
 */
router.get('/time-helper', (req, res) => {
  const hours = parseInt(req.query.hours) || 6;
  const now = new Date();
  const hoursAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);
  
  const startTime = formatJC261Time(hoursAgo);
  const endTime = formatJC261Time(now);
  
  return res.json({
    hours,
    startTime,
    endTime,
    readable: {
      start: hoursAgo.toLocaleString(),
      end: now.toLocaleString()
    },
    usage: {
      endpoint: `/api/playback/request-list/:imei`,
      withFilter: {
        startTime,
        endTime,
        useTFCard: true
      },
      getAllVideos: {
        useTFCard: true,
        note: 'Omit startTime and endTime to get ALL videos'
      }
    }
  });
});

/**
 * ✅ TEST/DIAGNOSTICS ENDPOINT
 * GET /api/playback/test-config
 */
router.get('/test-config', (req, res) => {
  const publicHost = process.env.HTTP_PUBLIC_HOST || 'localhost';
  const publicPort = process.env.HTTP_PUBLIC_PORT || '5000';
  const baseUrl = `http://${publicHost}:${publicPort}/api/playback/video-list`;
  
  return res.json({
    message: 'JC261 Playback Configuration (Enhanced with Debug Logging)',
    supportedFormats: ['.ts', '.mp4'],
    twoStepProcess: {
      step1: {
        command: `FILELIST,${baseUrl}#`,
        purpose: 'Configure server URL',
        serverFlag: '0x00000020'
      },
      step2: {
        tfCard: `TFFILELIST#`,
        internal: `FILELIST#`,
        purpose: 'Trigger file list upload',
        serverFlag: '0x00000021'
      }
    },
    endpoints: {
      requestList: 'POST /api/playback/request-list/:imei',
      manualUpload: 'POST /api/playback/upload-filelist/:imei',
      getVideos: 'GET /api/playback/videos/:imei',
      getParsedVideos: 'GET /api/playback/videos/:imei?parsed=true',
      startPlayback: 'POST /api/playback/start/:imei',
      stopPlayback: 'POST /api/playback/stop/:imei'
    },
    debugFeatures: {
      httpPostLogging: 'Server logs "🎯 HTTP POST RECEIVED" when /video-list is called',
      requestTracking: 'All endpoints log with 🔍 prefix for easy tracking',
      bodyInspection: 'Request headers and body are logged in detail'
    },
    manualUploadInstructions: {
      step1: 'Connect to device SD card',
      step2: 'Navigate to /storage/sdcard0/DVRMEDIA/CarRecorder/GENERAL/',
      step3: 'Copy fileinfo.fjson file',
      step4: `Upload to POST /api/playback/upload-filelist/:imei`,
      step5: 'Videos will be parsed and filtered automatically'
    },
    deviceFileStructure: {
      sdCard: '/storage/sdcard0/DVRMEDIA/CarRecorder/GENERAL/',
      folders: ['ForwardCam', 'InwardCam'],
      fileList: 'fileinfo.fjson',
      videoFormat: ['YYYY_MM_DD_HH_MM_SS_CH.ts', 'YYYY_MM_DD_HH_MM_SS_CH.mp4'],
      channelCodes: {
        '03': 'ForwardCam (Channel 0)',
        '04': 'InwardCam (Channel 1)'
      }
    },
    notes: [
      'Device creates .ts files (not .mp4) for recordings',
      'fileinfo.fjson contains JSON array of all videos',
      'If HTTP POST fails, use manual upload endpoint',
      'Both automatic (HTTP POST) and manual upload supported',
      'Server filters videos by date/time after receiving list',
      '🔍 Debug logging helps track if HTTP POST is received'
    ]
  });
});

/**
 * 🔍 NEW: DEBUG ENDPOINT TO TEST IF SERVER IS REACHABLE
 * GET /api/playback/ping
 */
router.get('/ping', (req, res) => {
  console.log('\n🔍 PING endpoint hit');
  console.log(`   IP: ${req.ip || req.connection?.remoteAddress}`);
  console.log(`   User-Agent: ${req.headers['user-agent']}`);
  
  return res.json({
    success: true,
    message: 'Playback service is running',
    timestamp: new Date().toISOString(),
    serverInfo: {
      publicHost: process.env.HTTP_PUBLIC_HOST || 'localhost',
      publicPort: process.env.HTTP_PUBLIC_PORT || '5000',
      videoListUrl: `http://${process.env.HTTP_PUBLIC_HOST || 'localhost'}:${process.env.HTTP_PUBLIC_PORT || '5000'}/api/playback/video-list`
    }
  });
});

export default router;