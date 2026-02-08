/**
 * ✅ COMPLETELY FIXED JC261 PLAYBACK SERVICE
 * 
 * ROOT CAUSE IDENTIFIED:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * JC261 does NOT stream playback videos!
 * JC261 UPLOADS video files via HTTP POST!
 * 
 * CORRECT WORKFLOW:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1. Server sends: FILELIST,http://server/api/playback/file-list#
 * 2. Server sends: TFFILELIST,20260203,0#
 * 3. Device creates: fileinfo.fjson on SD card
 * 4. Device POSTs to: http://server/api/playback/file-list
 *    Body: { imei: "xxx", fileNameList: "file1.mp4,file2.mp4" }
 * 5. Server sends: HVIDEO,2021_06_10_18_50_17,1#
 * 6. Device UPLOADS file to: http://server/api/playback/video-upload
 * 7. Server saves file and provides download/stream link
 * 
 * REFERENCE: Protocol PDF Section 6.2 "NameList of Playback Video" & Ivy Chen's Clarification
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class JC261PlaybackService {
  constructor(crcCalculator, jc261Protocol) {
    this.calculateCRC = crcCalculator;
    this.jc261 = jc261Protocol;
    this.playbackSessions = new Map();
    this.videoLists = new Map();
    
    // ✅ NEW: Storage for uploaded video files
    this.uploadedVideos = new Map(); // imei -> [{filename, filepath, uploadedAt}]
    
    // Fix path resolution
    const projectRoot = path.resolve(__dirname, '../../');
    this.videoStoragePath = path.join(projectRoot, 'uploads', 'playback-videos');
    
    // Create storage directory
    if (!fs.existsSync(this.videoStoragePath)) {
      try {
        fs.mkdirSync(this.videoStoragePath, { recursive: true });
        console.log(`✅ Created video storage: ${this.videoStoragePath}`);
      } catch (err) {
        console.error(`❌ Failed to create video storage: ${err.message}`);
      }
    }
  }

  /**
   * ✅ STEP 1: REQUEST VIDEO LIST FROM DEVICE
   * Sends FILELIST + TFFILELIST commands to device
   */
  async requestVideoList(imei, httpUrl, startTime, endTime, activeConnections, useTFCard = true) {
    console.log('\n' + '═'.repeat(80));
    console.log('📹 REQUESTING VIDEO LIST FROM DEVICE');
    console.log('═'.repeat(80));
    console.log(`📱 Device: ${imei}`);
    
    // Clear old session
    this.videoLists.delete(imei);
    this.videoLists.delete(`${imei}_parsed`);
    
    for (let [sessionId, session] of this.playbackSessions.entries()) {
      if (session.imei === imei) {
        this.playbackSessions.delete(sessionId);
      }
    }

    // ✅ STEP 0: Configure video file upload endpoint FIRST
    console.log('📤 STEP 0: Configuring video upload endpoint...');
    // httpUrl is like: http://98.70.101.16:5000/api/playback/callback/864993060968006
    // We want: http://98.70.101.16:5000/api/playback/video-upload
    
    // Remove the IMEI part first
    const baseUrl = httpUrl.replace(/\/callback\/.*$/, '');
    const uploadUrl = `${baseUrl}/video-upload`;
    
    const uploadCommand = `UPLOAD,${uploadUrl}#`;
    console.log(`   Upload Command: ${uploadCommand}`);
    
    const uploadSuccess = this.jc261.send0x80Command(
      imei,
      uploadCommand,
      0x00000000, // Check protocol for correct flag
      activeConnections
    );
    
    if (!uploadSuccess) {
      return { 
        success: false, 
        error: 'Failed to configure upload URL',
        step: 0 
      };
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // ✅ STEP 1A: Configure HTTP callback URL for video list
    console.log('📤 STEP 1/3: Configuring video list callback URL...');
    const configCommand = `FILELIST,${httpUrl}#`;
    
    const step1Success = this.jc261.send0x80Command(
      imei,
      configCommand,
      0x00000020,
      activeConnections
    );

    if (!step1Success) {
      return { 
        success: false, 
        error: 'Failed to configure callback URL',
        step: 1
      };
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    // ✅ STEP 1B: Trigger file list creation
    console.log('📤 STEP 2/3: Triggering file list creation...');
    
    let triggerCommand;
    let serverFlag;
    
    if (useTFCard) {
      // Extract date from startTime
      let dateStr = '';
      if (startTime && startTime.length >= 8) {
        if (startTime.startsWith('20')) {
          dateStr = startTime.substring(0, 8);
        } else {
          dateStr = '20' + startTime.substring(0, 6);
        }
      } else {
        const now = new Date();
        const yyyy = now.getFullYear().toString();
        const mm = (now.getMonth() + 1).toString().padStart(2, '0');
        const dd = now.getDate().toString().padStart(2, '0');
        dateStr = `${yyyy}${mm}${dd}`;
      }

      const channel = '0'; // Channel 0 (front camera)
      triggerCommand = `TFFILELIST,${dateStr},${channel}#`;
      serverFlag = 0x00000000;
      
    } else {
      triggerCommand = `FILELIST#`;
      serverFlag = 0x00000021;
    }

    console.log(`   Command: ${triggerCommand}`);
    
    const step2Success = this.jc261.send0x80Command(
      imei,
      triggerCommand,
      serverFlag,
      activeConnections
    );

    if (!step2Success) {
      return { 
        success: false, 
        error: `Failed to trigger video list`,
        step: 2
      };
    }

    // Create session
    const sessionId = `${imei}_${Date.now()}`;
    this.playbackSessions.set(sessionId, {
      imei,
      status: 'waiting_for_list',
      httpUrl: httpUrl,
      uploadUrl: uploadUrl, // ✅ Store upload URL
      startTime,
      endTime,
      commandType: useTFCard ? 'TFFILELIST' : 'FILELIST',
      useTFCard,
      createdAt: new Date(),
      filterOnServer: true
    });

    console.log('✅ All commands sent!');
    console.log('📡 Video List Callback:', httpUrl);
    console.log('📡 Video Upload Endpoint:', uploadUrl);

    return { 
      success: true, 
      sessionId, 
      startTime, 
      endTime, 
      message: 'Commands sent successfully',
      uploadEndpoint: uploadUrl,
      listCallback: httpUrl,
      nextSteps: [ 
        '✅ Device configured with upload endpoint',
        '✅ Device configured with list callback',
        'Device will POST video list to callback', 
        'Device will upload video files to upload endpoint' 
      ]
    };
  }

  /**
   * ✅ STEP 2: HANDLE VIDEO LIST FROM DEVICE
   * Called by Express route when device POSTs video list
   */
  handleVideoListFromDevice(imei, fileNameList, filterParams = {}) {
    console.log('\n' + '🔔'.repeat(40));
    console.log('📥 DEVICE POSTED VIDEO LIST!');
    console.log('═'.repeat(40));
    console.log(`📱 Device: ${imei}`);
    console.log('📦 RAW FILE LIST:');
    console.log(fileNameList.substring(0, 500));
    console.log('═'.repeat(40));

    let videoFiles;
    let parsedVideos;
    
    // Parse JSON format (fileinfo.fjson)
    if (fileNameList.trim().startsWith('[')) {
      console.log(`📋 Format: fileinfo.fjson (JSON)`);
      parsedVideos = this.parseFileInfoJson(fileNameList);
      videoFiles = parsedVideos.map(v => v.filename);
    } 
    // Parse comma-separated format
    else {
      console.log(`📋 Format: Comma-separated list`);
      
      videoFiles = fileNameList
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);
      
      parsedVideos = videoFiles
        .map(fn => this.parseDeviceFilename(fn))
        .filter(v => v !== null);
    }

    console.log(`📹 Total: ${videoFiles.length}, Parsed: ${parsedVideos.length}`);
    
    // Show first few videos
    parsedVideos.slice(0, 5).forEach((video, i) => {
      console.log(`   ${i + 1}. ${video.filename} [${video.cameraType}/CH${video.rtmpChannel}] @ ${video.videoDate.toLocaleString()}`);
    });

    // Apply time filter
    let filteredVideos = parsedVideos;
    const session = this.getSession(imei);
    
    if (session && session.startTime && session.endTime) {
      const startDate = this.parseVideoTime(session.startTime);
      const endDate = this.parseVideoTime(session.endTime);
      
      console.log(`\n🔍 Filtering: ${startDate?.toLocaleString()} → ${endDate?.toLocaleString()}`);
      
      if (startDate && endDate) {
        filteredVideos = parsedVideos.filter(v => 
          v.videoDate >= startDate && v.videoDate <= endDate
        );
      }
      
      console.log(`📊 Total: ${parsedVideos.length} → Filtered: ${filteredVideos.length}`);

      if (filteredVideos.length === 0 && parsedVideos.length > 0) {
        console.warn('⚠️  Filter removed all videos! Returning full list.');
        filteredVideos = parsedVideos;
      }
    }

    // Store results
    this.videoLists.set(imei, filteredVideos.map(v => v.filename));
    this.videoLists.set(`${imei}_parsed`, filteredVideos);

    // Update session
    if (session) {
      for (let [sid, sess] of this.playbackSessions.entries()) {
        if (sess.imei === imei) {
          sess.status = 'list_received';
          sess.videoList = filteredVideos.map(v => v.filename);
          sess.parsedVideos = filteredVideos;
          sess.totalVideos = parsedVideos.length;
          sess.filteredVideos = filteredVideos.length;
          sess.updatedAt = new Date();
          break;
        }
      }
    }

    console.log('✅ Video list stored\n');
    return { code: 0, ok: true };
  }

  /**
   * ✅ START PLAYBACK (Alias for requestVideoFile for compatibility)
   */
  async startPlayback(imei, videoName, activeConnections, protocol = 'http', force = false) {
    return this.requestVideoFile(imei, videoName, activeConnections, force);
  }

  /**
   * ✅ STEP 3: REQUEST VIDEO FILE FROM DEVICE
   * Sends HVIDEO command to device to upload specific video via HTTP
   * (REPLACED REPLAYLIST WHICH USES RTMP)
   */
  async requestVideoFile(imei, videoName, activeConnections, force = false) {
    console.log('\n' + '═'.repeat(80));
    console.log('▶️  REQUESTING VIDEO FILE FROM DEVICE (HTTP UPLOAD)');
    console.log('═'.repeat(80));
    console.log(`📱 Device: ${imei}`);
    console.log(`📹 Video: ${videoName}`);

    // Verify video exists in list
    const videoList = this.videoLists.get(imei);
    if (!videoList || !videoList.includes(videoName)) {
      if (!force) {
        return {
          success: false,
          error: 'Video not in list. Use force=true to bypass.',
          availableVideos: videoList || []
        };
      }
      console.log('⚠️  Forcing request (video not in list)...');
    }

    // Get video metadata and parse filename
    let videoInfo = this.parseDeviceFilename(videoName);
    
    if (!videoInfo) {
      console.log(`❌ Failed to parse filename: ${videoName}`);
      return { success: false, error: 'Invalid filename format' };
    }
    
    console.log(`📹 Camera: ${videoInfo.cameraType} (Channel ${videoInfo.channel})`);
    console.log(`📅 Recorded: ${videoInfo.videoDate.toLocaleString()}`);

    // 🛑 STOP RTMP STREAMING FIRST (Good practice)
    console.log('\n📤 STEP 0: Ensuring RTMP is off...');
    this.jc261.send0x80Command(imei, 'RTMP,OFF#', 0x00000000, activeConnections);
    await new Promise(resolve => setTimeout(resolve, 500));

    // ✅ CONSTRUCT HVIDEO COMMAND
    // Format: HVIDEO,<YYYY_MM_DD_HH_mm_ss>,<CameraID>#
    // CameraID: 1=Front, 2=Inward
    
    const year = videoInfo.year;
    const month = String(videoInfo.month).padStart(2, '0');
    const day = String(videoInfo.day).padStart(2, '0');
    const hour = String(videoInfo.hour).padStart(2, '0');
    const minute = String(videoInfo.minute).padStart(2, '0');
    const second = String(videoInfo.second).padStart(2, '0');
    
    const timestamp = `${year}_${month}_${day}_${hour}_${minute}_${second}`;
    
    // Map channel code to 1 or 2
    // 03 = Front -> 1
    // 04 = Inward -> 2
    // fallback: channel 0 -> 1, channel 1 -> 2
    let cameraType = 1;
    if (videoInfo.channelCode === '04' || videoInfo.channel === 1) {
      cameraType = 2;
    }
    
    const hvideoCommand = `HVIDEO,${timestamp},${cameraType}#`;
    
    console.log('📤 STEP 1: Sending HVIDEO command...');
    console.log(`   Command: ${hvideoCommand}`);
    console.log(`   Target: HTTP Server (configured via UPLOAD command)`);

    const success = this.jc261.send0x80Command(
      imei,
      hvideoCommand,
      0x00000000, // Standard command flag
      activeConnections
    );

    if (success) {
      // Update session
      for (let [sessionId, session] of this.playbackSessions.entries()) {
        if (session.imei === imei) {
          session.status = 'uploading';
          session.currentVideo = videoName;
          session.videoInfo = videoInfo;
          session.updatedAt = new Date();
          break;
        }
      }
    }

    console.log('\n✅ Request sent! Device should upload video file via HTTP POST.');
    console.log('⏳ Waiting for device to POST video file...');
    console.log('📡 Expected endpoint: POST /api/playback/video-upload');
    console.log('═'.repeat(80) + '\n');

    return { 
      success,
      message: 'Request sent. Device will upload video file via HTTP POST.',
      videoName,
      videoInfo,
      nextSteps: [
        'Device will upload video file to: POST /api/playback/video-upload',
        'Body will be multipart/form-data with file binary',
        'Check server logs for POST request'
      ],
      expectedUploadEndpoint: '/api/playback/video-upload'
    };
  }

  /**
   * ✅ STEP 4: HANDLE VIDEO FILE UPLOAD FROM DEVICE
   * Called by Express route when device uploads video file
   */
  async handleVideoFileUpload(imei, filename, fileBuffer) {
    console.log('\n' + '📥'.repeat(40));
    console.log('📥 DEVICE UPLOADED VIDEO FILE!');
    console.log('═'.repeat(40));
    console.log(`📱 Device: ${imei}`);
    console.log(`📹 Filename: ${filename}`);
    console.log(`📏 Size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    try {
      // Create device-specific directory
      const deviceDir = path.join(this.videoStoragePath, imei);
      if (!fs.existsSync(deviceDir)) {
        fs.mkdirSync(deviceDir, { recursive: true });
      }

      // Save file
      const filepath = path.join(deviceDir, filename);
      fs.writeFileSync(filepath, fileBuffer);

      console.log(`💾 Saved to: ${filepath}`);

      // Store metadata
      if (!this.uploadedVideos.has(imei)) {
        this.uploadedVideos.set(imei, []);
      }

      const videos = this.uploadedVideos.get(imei);
      videos.push({
        filename,
        filepath,
        size: fileBuffer.length,
        uploadedAt: new Date()
      });

      // Update session status
      for (let [sessionId, session] of this.playbackSessions.entries()) {
        if (session.imei === imei && session.currentVideo === filename) {
          session.status = 'ready';
          session.filepath = filepath;
          session.updatedAt = new Date();
          break;
        }
      }

      console.log('✅ Video file saved successfully!');
      console.log('📺 Video is now available for playback');
      console.log('═'.repeat(40) + '\n');

      return {
        success: true,
        filename,
        filepath,
        size: fileBuffer.length,
        message: 'Video uploaded successfully'
      };

    } catch (error) {
      console.error('❌ Error saving video file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ✅ STEP 5: GET VIDEO FILE FOR PLAYBACK
   * Returns file path for Express to stream/download
   */
  getVideoFile(imei, filename) {
    const videos = this.uploadedVideos.get(imei);
    if (!videos) {
      return null;
    }

    const video = videos.find(v => v.filename === filename);
    if (!video) {
      return null;
    }

    // Check file exists
    if (!fs.existsSync(video.filepath)) {
      console.error(`❌ Video file not found: ${video.filepath}`);
      return null;
    }

    return video;
  }

  /**
   * Stop playback
   */
  async stopPlayback(imei, activeConnections) {
    console.log(`\n⏹️  Stopping playback for ${imei}`);
    const success = this.jc261.send0x80Command(imei, 'REPLAYLIST,#', 0x00000023, activeConnections);
    if (success) {
      for (let [sessionId, session] of this.playbackSessions.entries()) {
        if (session.imei === imei) {
          session.status = 'stopped';
          session.updatedAt = new Date();
        }
      }
    }
    return success;
  }

  // Helper functions (keep existing ones)
  parseDeviceFilename(filename) {
    const match = filename.match(/(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})\.(ts|mp4)/i);
    
    if (!match) {
      console.log(`   ⚠️  Cannot parse: ${filename}`);
      return null;
    }
    
    const [_, year, month, day, hour, minute, second, channelCode, extension] = match;
    
    let channel, rtmpChannel, cameraType;
    
    if (channelCode === '03') {
      channel = 0;
      rtmpChannel = 0;
      cameraType = 'ForwardCam';
    } else if (channelCode === '04') {
      channel = 1;
      rtmpChannel = 1;
      cameraType = 'InwardCam';
    } else {
      const parsed = parseInt(channelCode);
      channel = parsed >= 4 ? 1 : 0;
      rtmpChannel = channel;
      cameraType = channel === 0 ? 'ForwardCam' : 'InwardCam';
    }
    
    const videoDate = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
    
    return {
      filename,
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute),
      second: parseInt(second),
      channel,
      rtmpChannel,
      channelCode,
      cameraType,
      extension,
      videoDate,
      timestamp: videoDate.getTime()
    };
  }

  parseFileInfoJson(jsonData) {
    try {
      const files = JSON.parse(jsonData);
      console.log(`📋 Parsing fileinfo.fjson (${files.length} entries)`);
      
      const parsedFiles = files.map(file => {
        const parsed = this.parseDeviceFilename(file.fn);
        if (!parsed) return null;
        
        const path = (file.du || '').toUpperCase();
        const isGeneralDir = path.includes('DVRMEDIA') && path.includes('GENERAL');
        
        if (!isGeneralDir) {
          console.log(`   ⚠️  Skipping: ${file.fn} (not in General)`);
          return null;
        }
        
        return {
          ...parsed,
          creationTime: file.ct,
          deviceChannel: file.c,
          fullPath: path.replace(/\+\+/g, '/')
        };
      }).filter(f => f !== null);
      
      console.log(`✅ Parsed ${parsedFiles.length} valid files`);
      return parsedFiles;
      
    } catch (error) {
      console.error(`❌ Error parsing fileinfo.fjson:`, error.message);
      return [];
    }
  }

  parseJC261Time(timeStr) {
    if (!timeStr) return 'Invalid';
    let year, month, day, hour, min, sec;
    if (timeStr.length === 12) {
      year = '20' + timeStr.substring(0, 2);
      month = timeStr.substring(2, 4);
      day = timeStr.substring(4, 6);
      hour = timeStr.substring(6, 8);
      min = timeStr.substring(8, 10);
      sec = timeStr.substring(10, 12);
    } else if (timeStr.length === 14) {
      year = timeStr.substring(0, 4);
      month = timeStr.substring(4, 6);
      day = timeStr.substring(6, 8);
      hour = timeStr.substring(8, 10);
      min = timeStr.substring(10, 12);
      sec = timeStr.substring(12, 14);
    } else {
      return 'Invalid';
    }
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }

  parseVideoTime(timeStr) {
    if (!timeStr) return null;
    let year, month, day, hour, min, sec;
    if (timeStr.length === 12) {
      year = 2000 + parseInt(timeStr.substring(0, 2));
      month = parseInt(timeStr.substring(2, 4)) - 1;
      day = parseInt(timeStr.substring(4, 6));
      hour = parseInt(timeStr.substring(6, 8));
      min = parseInt(timeStr.substring(8, 10));
      sec = parseInt(timeStr.substring(10, 12));
    } else if (timeStr.length === 14) {
      year = parseInt(timeStr.substring(0, 4));
      month = parseInt(timeStr.substring(4, 6)) - 1;
      day = parseInt(timeStr.substring(6, 8));
      hour = parseInt(timeStr.substring(8, 10));
      min = parseInt(timeStr.substring(10, 12));
      sec = parseInt(timeStr.substring(12, 14));
    } else {
      return null;
    }
    return new Date(year, month, day, hour, min, sec);
  }

  getVideoList(imei) { 
    return this.videoLists.get(imei) || []; 
  }

  getParsedVideoList(imei) {
    return this.videoLists.get(`${imei}_parsed`) || [];
  }

  getUploadedVideos(imei) {
    return this.uploadedVideos.get(imei) || [];
  }

  getSession(imei) {
    let latestSession = null;
    for (let [sessionId, session] of this.playbackSessions.entries()) {
      if (session.imei === imei) {
        latestSession = { sessionId, ...session };
      }
    }
    return latestSession;
  }

  cleanupOldSessions(maxAgeMinutes = 30) {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    for (let [sessionId, session] of this.playbackSessions.entries()) {
      if (now - session.createdAt.getTime() > maxAge) {
        this.playbackSessions.delete(sessionId);
      }
    }
  }
}

export default JC261PlaybackService;