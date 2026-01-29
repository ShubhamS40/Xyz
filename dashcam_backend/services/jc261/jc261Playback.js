/**
 * JC261 PLAYBACK SERVICE
 * Handles history video playback using PLAYBACK protocol from PDF
 */

class JC261PlaybackService {
  constructor(crcCalculator, jc261Protocol) {
    this.calculateCRC = crcCalculator;
    this.jc261 = jc261Protocol;
    this.playbackSessions = new Map(); // Track active playback sessions
  }

  /**
   * 📹 REQUEST PLAYBACK VIDEO LIST
   * Protocol: 0x80 command "PLAYBACK,LIST,startTime,endTime,channel#"
   * 
   * @param {string} imei - Device IMEI
   * @param {Date} startTime - Start time (UTC)
   * @param {Date} endTime - End time (UTC)
   * @param {number} channel - Camera channel (0=front, 1=cabin)
   * @param {Map} activeConnections - Active device connections
   */
  async requestVideoList(imei, startTime, endTime, channel, activeConnections) {
    console.log('\n' + '═'.repeat(80));
    console.log('📹 REQUESTING PLAYBACK VIDEO LIST');
    console.log('═'.repeat(80));
    console.log(`📱 Device: ${imei}`);
    console.log(`📅 Period: ${startTime.toISOString()} → ${endTime.toISOString()}`);
    console.log(`📹 Channel: ${channel} (${channel === 0 ? 'Front' : 'Cabin'})`);

    // Format time as per JC261 protocol: YYMMDDhhmmss
    const formatTime = (date) => {
      const y = String(date.getUTCFullYear()).slice(2);
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      const h = String(date.getUTCHours()).padStart(2, '0');
      const min = String(date.getUTCMinutes()).padStart(2, '0');
      const s = String(date.getUTCSeconds()).padStart(2, '0');
      return `${y}${m}${d}${h}${min}${s}`;
    };

    const start = formatTime(startTime);
    const end = formatTime(endTime);
    const ch = channel || 0;

    // Command format: PLAYBACK,LIST,startTime,endTime,channel#
    const command = `PLAYBACK,LIST,${start},${end},${ch}#`;
    
    console.log(`📤 Command: ${command}`);
    console.log('═'.repeat(80) + '\n');

    // Send 0x80 command via JC261 protocol
    const success = this.jc261.send0x80Command(
      imei, 
      command, 
      0x00000010, // Unique server flag for playback list request
      activeConnections
    );

    if (success) {
      // Create playback session
      const sessionId = `${imei}_${Date.now()}`;
      this.playbackSessions.set(sessionId, {
        imei,
        startTime,
        endTime,
        channel,
        status: 'requesting_list',
        createdAt: new Date()
      });

      return { success: true, sessionId };
    }

    return { success: false, error: 'Failed to send command' };
  }

  /**
   * 📥 START PLAYBACK STREAM
   * Protocol: 0x80 command "PLAYBACK,START,filename,rtmpUrl#"
   * 
   * @param {string} imei - Device IMEI
   * @param {string} filename - Video filename from list response
   * @param {string} rtmpUrl - RTMP server URL (optional)
   * @param {Map} activeConnections - Active device connections
   */
  async startPlaybackStream(imei, filename, rtmpUrl, activeConnections) {
    console.log('\n' + '═'.repeat(80));
    console.log('▶️  STARTING PLAYBACK STREAM');
    console.log('═'.repeat(80));
    console.log(`📱 Device: ${imei}`);
    console.log(`📄 File: ${filename}`);

    // Use default RTMP server if not provided
    const publicRtmpHost = process.env.RTMP_PUBLIC_HOST || '159.223.171.199';
    const publicRtmpPort = process.env.RTMP_PUBLIC_PORT || '41378';
    const rtmpBase = rtmpUrl || `rtmp://${publicRtmpHost}:${publicRtmpPort}/playback`;
    
    console.log(`🔗 RTMP: ${rtmpBase}/${imei}`);

    // Command format: PLAYBACK,START,filename,rtmpUrl#
    const command = `PLAYBACK,START,${filename},${rtmpBase}#`;
    
    console.log(`📤 Command: ${command}`);
    console.log('═'.repeat(80) + '\n');

    const success = this.jc261.send0x80Command(
      imei,
      command,
      0x00000011, // Unique server flag for playback start
      activeConnections
    );

    return { 
      success, 
      streamUrl: `${rtmpBase}/${imei}`,
      httpUrl: `http://${publicRtmpHost}:8888/playback/${imei}` // For web player
    };
  }

  /**
   * ⏸️ PAUSE PLAYBACK
   */
  async pausePlayback(imei, activeConnections) {
    console.log(`⏸️  Pausing playback for ${imei}`);
    const command = 'PLAYBACK,PAUSE#';
    
    return this.jc261.send0x80Command(
      imei,
      command,
      0x00000012,
      activeConnections
    );
  }

  /**
   * ▶️ RESUME PLAYBACK
   */
  async resumePlayback(imei, activeConnections) {
    console.log(`▶️  Resuming playback for ${imei}`);
    const command = 'PLAYBACK,RESUME#';
    
    return this.jc261.send0x80Command(
      imei,
      command,
      0x00000013,
      activeConnections
    );
  }

  /**
   * ⏹️ STOP PLAYBACK
   */
  async stopPlayback(imei, activeConnections) {
    console.log(`⏹️  Stopping playback for ${imei}`);
    const command = 'PLAYBACK,STOP#';
    
    const success = this.jc261.send0x80Command(
      imei,
      command,
      0x00000014,
      activeConnections
    );

    // Clean up session
    if (success) {
      for (let [sessionId, session] of this.playbackSessions.entries()) {
        if (session.imei === imei) {
          this.playbackSessions.delete(sessionId);
        }
      }
    }

    return success;
  }

  /**
   * 📋 GET VIDEO LIST FROM DEVICE RESPONSE
   * Called when device sends video list via 0x94 or HTTP POST
   */
  handleVideoListResponse(imei, videoList) {
    console.log(`📋 Received video list for ${imei}:`, videoList);
    
    // Update session with video list
    for (let [sessionId, session] of this.playbackSessions.entries()) {
      if (session.imei === imei && session.status === 'requesting_list') {
        session.status = 'list_received';
        session.videoList = videoList;
        session.updatedAt = new Date();
        break;
      }
    }

    return videoList;
  }

  /**
   * 🔍 GET ACTIVE PLAYBACK SESSIONS
   */
  getPlaybackSessions() {
    return Array.from(this.playbackSessions.entries()).map(([id, session]) => ({
      sessionId: id,
      ...session
    }));
  }
}

export default JC261PlaybackService;