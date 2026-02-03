/**
 * ✅ FIXED JC261 PLAYBACK SERVICE - HANDLES ACTUAL DEVICE BEHAVIOR
 * 
 * CRITICAL FIXES:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1. Support for .ts files (not just .mp4)
 * 2. Handle fileinfo.fjson structure from device
 * 3. Parse filenames with format: YYYY_MM_DD_HH_MM_SS_CH.ts
 * 4. Handle paths with ++ separators
 * 5. Support both HTTP POST and alternative retrieval methods
 * 
 * DEVICE BEHAVIOR (from your fileinfo.fjson):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - Files: .ts format (not .mp4)
 * - Structure: {"ct":timestamp,"c":channel,"fn":"filename","gi":timestamp,"du":"path"}
 * - Path format: ++storage++sdcard0++DVRMEDIA++CarRecorder++GENERAL++InwardCam++...
 * - Channel: 1 = ForwardCam (CH0), 2 = InwardCam (CH1)
 */

class JC261PlaybackService {
  constructor(crcCalculator, jc261Protocol) {
    this.calculateCRC = crcCalculator;
    this.jc261 = jc261Protocol;
    this.playbackSessions = new Map();
    this.videoLists = new Map();
  }

  /**
   * ✅ REQUEST VIDEO LIST - TWO-STEP PROCESS
   * Now supports both .mp4 and .ts file formats
   */
  async requestVideoList(imei, httpUrl, startTime, endTime, activeConnections, useTFCard = true) {
    console.log('\n' + '═'.repeat(80));
    console.log('📹 REQUESTING VIDEO LIST (SUPPORTS .ts AND .mp4 FILES)');
    console.log('═'.repeat(80));
    console.log(`📱 Device: ${imei}`);
    console.log(`📡 Server URL: ${httpUrl}`);
    console.log(`📅 Filter Range: ${this.parseJC261Time(startTime)} → ${this.parseJC261Time(endTime)}`);
    console.log(`   ⚠️  Filtering done SERVER-SIDE (not in command)`);
    
    const commandType = useTFCard ? 'TFFILELIST' : 'FILELIST';
    
    console.log(`\n🔄 TWO-STEP PROCESS:`);
    console.log(`   Step 1: FILELIST,${httpUrl}# → Configure server address`);
    console.log(`   Step 2: ${commandType}# → Trigger file list upload`);
    console.log('');
    console.log('⚠️  CRITICAL NOTES:');
    console.log('   • Supports both .ts and .mp4 video formats');
    console.log('   • Device creates fileinfo.fjson on SD card');
    console.log('   • Server parses actual device filename format');
    console.log('═'.repeat(80) + '\n');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: Configure Server URL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 STEP 1/2: Configuring server URL...');
    const configCommand = `FILELIST,${httpUrl}#`;
    console.log(`   Command: ${configCommand}`);
    
    const step1Success = this.jc261.send0x80Command(
      imei,
      configCommand,
      0x00000020,
      activeConnections
    );

    if (!step1Success) {
      console.error('❌ Step 1 failed - could not configure server URL');
      return { 
        success: false, 
        error: 'Failed to configure server URL (Step 1)',
        step: 1
      };
    }

    console.log('✅ Step 1 complete - server URL configured');
    console.log('⏳ Waiting 1 second before Step 2...\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: Trigger File List Upload
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📤 STEP 2/2: Triggering file list upload...');
    const triggerCommand = `${commandType}#`;
    console.log(`   Command: ${triggerCommand}`);
    console.log(`   Source: ${useTFCard ? 'TF Card (high-quality)' : 'Internal Memory (low-quality)'}`);
    
    const step2Success = this.jc261.send0x80Command(
      imei,
      triggerCommand,
      0x00000021,
      activeConnections
    );

    if (!step2Success) {
      console.error('❌ Step 2 failed - could not trigger file list upload');
      return { 
        success: false, 
        error: `Failed to trigger ${commandType} upload (Step 2)`,
        step: 2
      };
    }

    // Create session to track request
    const sessionId = `${imei}_${Date.now()}`;
    this.playbackSessions.set(sessionId, {
      imei,
      status: 'waiting_for_list',
      httpUrl: httpUrl,
      startTime,
      endTime,
      commandType,
      useTFCard,
      createdAt: new Date(),
      filterOnServer: true
    });

    console.log('\n' + '═'.repeat(80));
    console.log('✅ BOTH COMMANDS SENT SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log('⏳ Device will now:');
    console.log('   1. Scan SD/TF card for ALL video files (.ts or .mp4)');
    console.log('   2. HTTP POST complete list to server');
    console.log('   3. Server filters by date/time range');
    console.log('');
    console.log(`📥 Expected HTTP POST:`);
    console.log(`   POST ${httpUrl}`);
    console.log(`   Body: {`);
    console.log(`     "imei": "${imei}",`);
    console.log(`     "fileNameList": "file1.ts,file2.ts,file3.mp4,..."`);
    console.log(`   }`);
    console.log('');
    console.log('📊 Alternative: Device may create fileinfo.fjson on SD card');
    console.log('═'.repeat(80) + '\n');

    return {
      success: true,
      sessionId,
      startTime,
      endTime,
      commandType,
      filterRange: `${this.parseJC261Time(startTime)} - ${this.parseJC261Time(endTime)}`,
      message: `${commandType} request sent. Device will POST videos or create fileinfo.fjson. Check GET /videos/:imei in 30 seconds.`,
      supportedFormats: ['.ts', '.mp4'],
      note: 'If HTTP POST fails, check device SD card for fileinfo.fjson'
    };
  }

  /**
   * ✅ PARSE DEVICE FILENAME (SUPPORTS .ts AND .mp4)
   * Formats supported:
   * - YYYY_MM_DD_HH_MM_SS_CH.ts  (actual device format)
   * - YYYY_MM_DD_HH_MM_SS_CH.mp4 (legacy format)
   * 
   * Channel mapping:
   * - CH ending with 03: ForwardCam (Channel 0)
   * - CH ending with 04: InwardCam (Channel 1)
   */
  parseDeviceFilename(filename) {
    // Extract date/time from filename
    // Format: 2026_02_02_21_10_19_04.ts
    //         YYYY_MM_DD_HH_MM_SS_CH.ext
    const match = filename.match(/(\d{4})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})_(\d{2})\.(ts|mp4)/i);
    
    if (!match) {
      console.log(`   ⚠️  Cannot parse: ${filename}`);
      return null;
    }
    
    const [_, year, month, day, hour, minute, second, channelCode, extension] = match;
    
    // Determine channel from last 2 digits
    // 03 = ForwardCam (CH0), 04 = InwardCam (CH1)
    let channel;
    let cameraType;
    if (channelCode === '03') {
      channel = 0;
      cameraType = 'ForwardCam';
    } else if (channelCode === '04') {
      channel = 1;
      cameraType = 'InwardCam';
    } else {
      channel = parseInt(channelCode) % 2; // Fallback
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
      channelCode,
      cameraType,
      extension,
      videoDate,
      timestamp: videoDate.getTime()
    };
  }

  /**
   * ✅ PARSE fileinfo.fjson FORMAT
   * Device creates JSON array with this structure:
   * [
   *   {
   *     "ct": 1770046458000,  // creation timestamp
   *     "c": 2,                // channel (1=forward, 2=inward)
   *     "fn": "2026_02_02_21_04_18_04.ts",
   *     "gi": 1770046458000,
   *     "du": "++storage++sdcard0++DVRMEDIA++CarRecorder++GENERAL++InwardCam++2026_02_02++2026_02_02_21_04_18_04.ts"
   *   }
   * ]
   */
  parseFileInfoJson(jsonData) {
    try {
      const files = JSON.parse(jsonData);
      
      console.log(`📋 Parsing fileinfo.fjson format (${files.length} entries)`);
      
      const parsedFiles = files.map(file => {
        const parsed = this.parseDeviceFilename(file.fn);
        if (!parsed) return null;
        
        // 🚨 CRITICAL FILTER: Only include files from DVRMEDIA/General directory
        // Path format: ++storage++sdcard0++DVRMEDIA++CarRecorder++GENERAL++InwardCam++...
        const path = file.du || '';
        const isGeneralDir = path.includes('DVRMEDIA') && path.includes('GENERAL');
        
        if (!isGeneralDir) {
          console.log(`   ⚠️ Skipping file not in General directory: ${file.fn} (${path})`);
          return null;
        }
        
        // Add fileinfo.fjson specific data
        return {
          ...parsed,
          creationTime: file.ct,
          deviceChannel: file.c, // 1=forward, 2=inward
          fullPath: path.replace(/\+\+/g, '/')
        };
      }).filter(f => f !== null);
      
      console.log(`✅ Successfully parsed ${parsedFiles.length} files`);
      return parsedFiles;
      
    } catch (error) {
      console.error(`❌ Error parsing fileinfo.fjson:`, error.message);
      return [];
    }
  }

  /**
   * Parse JC261 time format (YYMMDDHHMMSS) to readable format
   */
  parseJC261Time(timeStr) {
    if (!timeStr || timeStr.length !== 12) return 'Invalid';
    const year = '20' + timeStr.substring(0, 2);
    const month = timeStr.substring(2, 4);
    const day = timeStr.substring(4, 6);
    const hour = timeStr.substring(6, 8);
    const min = timeStr.substring(8, 10);
    const sec = timeStr.substring(10, 12);
    return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
  }

  /**
   * Parse YYMMDDHHMMSS to Date object
   */
  parseVideoTime(timeStr) {
    if (!timeStr || timeStr.length !== 12) return null;
    
    const year = 2000 + parseInt(timeStr.substring(0, 2));
    const month = parseInt(timeStr.substring(2, 4)) - 1;
    const day = parseInt(timeStr.substring(4, 6));
    const hour = parseInt(timeStr.substring(6, 8));
    const min = parseInt(timeStr.substring(8, 10));
    const sec = parseInt(timeStr.substring(10, 12));
    
    return new Date(year, month, day, hour, min, sec);
  }

  /**
   * ✅ HANDLE VIDEO LIST FROM DEVICE (SUPPORTS MULTIPLE FORMATS)
   * 
   * Supports:
   * 1. HTTP POST with fileNameList (comma-separated)
   * 2. fileinfo.fjson format (JSON array)
   * 3. Both .ts and .mp4 files
   */
  handleVideoListFromDevice(imei, fileNameList, filterParams = {}) {
    console.log('\n' + '🔔'.repeat(40));
    console.log('📥 DEVICE POSTED VIDEO LIST!');
    console.log('🔔'.repeat(40));
    console.log(`📱 Device: ${imei}`);
    
    let videoFiles;
    let parsedVideos;
    
    // ✅ Detect format: JSON array or comma-separated string
    if (fileNameList.trim().startsWith('[')) {
      // fileinfo.fjson format
      console.log(`📋 Format: fileinfo.fjson (JSON array)`);
      parsedVideos = this.parseFileInfoJson(fileNameList);
      videoFiles = parsedVideos.map(v => v.filename);
    } else {
      // Standard comma-separated format
      console.log(`📋 Format: Standard comma-separated list`);
      console.warn('⚠️  WARNING: Received simple filename list (no paths). Cannot verify DVRMEDIA/General directory!');
      
      videoFiles = fileNameList
        .split(',')
        .map(f => f.trim())
        .filter(f => f.length > 0);
      
      // Parse each filename
      parsedVideos = videoFiles
        .map(fn => this.parseDeviceFilename(fn))
        .filter(v => v !== null);
    }

    console.log(`📹 Total videos on device: ${videoFiles.length}`);
    console.log(`✅ Successfully parsed: ${parsedVideos.length}`);
    
    // Show sample videos
    parsedVideos.slice(0, 5).forEach((video, index) => {
      console.log(`   ${index + 1}. ${video.filename} [${video.cameraType}] @ ${video.videoDate.toLocaleString()}`);
    });
    if (parsedVideos.length > 5) {
      console.log(`   ... and ${parsedVideos.length - 5} more`);
    }

    // ✅ SERVER-SIDE DATE/TIME FILTERING
    let filteredVideos = parsedVideos;
    const session = this.getSession(imei);
    
    if (session && session.startTime && session.endTime) {
      const startDate = this.parseVideoTime(session.startTime);
      const endDate = this.parseVideoTime(session.endTime);
      
      console.log(`\n🔍 Applying server-side date/time filter:`);
      console.log(`   Start: ${startDate.toLocaleString()}`);
      console.log(`   End:   ${endDate.toLocaleString()}`);
      
      filteredVideos = parsedVideos.filter(video => {
        const inRange = video.videoDate >= startDate && video.videoDate <= endDate;
        return inRange;
      });
      
      console.log(`\n📊 Filtering results:`);
      console.log(`   Total videos:    ${parsedVideos.length}`);
      console.log(`   After filtering: ${filteredVideos.length}`);
      console.log(`   Removed:         ${parsedVideos.length - filteredVideos.length}`);
    } else {
      console.log(`\n⚠️  No filter range found - returning ALL ${parsedVideos.length} videos`);
    }

    // Store FILTERED list (just filenames for backward compatibility)
    const filteredFilenames = filteredVideos.map(v => v.filename);
    this.videoLists.set(imei, filteredFilenames);
    
    // Also store parsed video objects for advanced features
    this.videoLists.set(`${imei}_parsed`, filteredVideos);

    // Update session
    if (session) {
      session.status = 'list_received';
      session.videoList = filteredFilenames;
      session.parsedVideos = filteredVideos;
      session.totalVideos = parsedVideos.length;
      session.filteredVideos = filteredVideos.length;
      session.updatedAt = new Date();
    }

    console.log('\n✅ Video list stored successfully');
    console.log(`📊 GET /api/playback/videos/${imei} will return ${filteredVideos.length} videos`);
    console.log('🔔'.repeat(40) + '\n');

    return { code: 0, ok: true };
  }

  /**
   * ✅ START PLAYBACK (SUPPORTS .ts FILES)
   * Command: REPLAYLIST,<videoname>#
   */
  async startPlayback(imei, videoName, activeConnections, force = false) {
    console.log('\n' + '═'.repeat(80));
    console.log('▶️  STARTING VIDEO PLAYBACK (.ts/.mp4 SUPPORT)');
    console.log('═'.repeat(80));
    console.log(`📱 Device: ${imei}`);
    console.log(`📹 Video: ${videoName}`);

    const videoList = this.videoLists.get(imei);
    if (!videoList || !videoList.includes(videoName)) {
      console.warn('⚠️  Video not found in device list!');
      if (!force) {
        console.error('❌ Playback aborted (use force=true to bypass)');
        return {
          success: false,
          error: 'Video not found in cached list. Request list first or set force=true.',
          availableVideos: videoList || [],
          suggestion: 'Use POST /request-list/:imei first, or add "force": true to body.'
        };
      }
      console.log('⚠️  Proceeding anyway (force=true)...');
    }

    // Get parsed video info
    const parsedVideos = this.videoLists.get(`${imei}_parsed`) || [];
    const videoInfo = parsedVideos.find(v => v.filename === videoName);
    
    if (videoInfo) {
      console.log(`📹 Camera: ${videoInfo.cameraType} (Channel ${videoInfo.channel})`);
      console.log(`📅 Recorded: ${videoInfo.videoDate.toLocaleString()}`);
      console.log(`📁 Format: ${videoInfo.extension.toUpperCase()}`);
    }

    const command = `REPLAYLIST,${videoName}#`;
    console.log(`📤 Command: ${command}`);

    const success = this.jc261.send0x80Command(
      imei,
      command,
      0x00000022,
      activeConnections
    );

    const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';
    const rtmpUrl = `rtmp://localhost:1936/live/${imei}`;
    const hlsUrl  = `http://localhost:${hlsPort}/live/${imei}/index.m3u8`;
    const flvUrl  = `http://localhost:${hlsPort}/live/${imei}.flv`;

    console.log('');
    console.log('📺 Stream URLs (historical playback):');
    console.log(`   RTMP: ${rtmpUrl}`);
    console.log(`   HLS:  ${hlsUrl}`);
    console.log(`   FLV:  ${flvUrl}`);
    console.log('⏳ Wait 3-5 seconds then open HLS URL in VLC.');
    console.log('═'.repeat(80) + '\n');

    if (success) {
      for (let [sessionId, session] of this.playbackSessions.entries()) {
        if (session.imei === imei) {
          session.status = 'playing';
          session.currentVideo = videoName;
          session.videoInfo = videoInfo;
          session.updatedAt = new Date();
          break;
        }
      }
    }

    return { 
      success, 
      streamUrl: rtmpUrl, 
      hlsUrl, 
      flvUrl,
      videoInfo: videoInfo || null
    };
  }

  /** Stop playback */
  async stopPlayback(imei, activeConnections) {
    console.log(`\n⏹️  Stopping playback for ${imei}`);
    const success = this.jc261.send0x80Command(imei, 'REPLAYLIST,#', 0x00000023, activeConnections);
    if (success) {
      for (let [sessionId, session] of this.playbackSessions.entries()) {
        if (session.imei === imei) this.playbackSessions.delete(sessionId);
      }
    }
    return success;
  }

  getVideoList(imei) { 
    return this.videoLists.get(imei) || []; 
  }

  getParsedVideoList(imei) {
    return this.videoLists.get(`${imei}_parsed`) || [];
  }

  getSession(imei) {
    for (let [sessionId, session] of this.playbackSessions.entries()) {
      if (session.imei === imei) return { sessionId, ...session };
    }
    return null;
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