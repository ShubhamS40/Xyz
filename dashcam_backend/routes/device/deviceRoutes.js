import express from 'express';
import deviceController from '../../controller/device/deviceController.js';
import deviceModel from '../../model/deviceModel.js';

const router = express.Router();

// GET all devices
router.get('/', deviceController.getAllDevices);

// GET device by IMEI
router.get('/:imei', deviceController.getDeviceByIMEI);

// POST add new device
router.post('/', deviceController.addDevice);

// PATCH update device status
router.patch('/:imei/status', deviceController.updateDeviceStatus);

// DELETE device
router.delete('/:imei', deviceController.deleteDevice);

// POST request location from device
router.post('/:imei/request-location', (req, res) => {
  try {
    const { imei } = req.params;
    const tcpServer = global.tcpServer;
    
    if (!tcpServer) {
      return res.status(500).json({
        success: false,
        message: 'TCP Server not initialized'
      });
    }
    
    const success = tcpServer.requestLocation(imei);
    
    if (success) {
      res.json({
        success: true,
        message: 'Location request sent to device'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Device not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send location request',
      error: error.message
    });
  }
});

// POST start RTMP stream for device
router.post('/:imei/start-rtmp', async (req, res) => {
  try {
    const { imei } = req.params;
    const { rtmpUrl, cameraIndex = 0, durationMinutes } = req.body; // cameraIndex: 0 = front (OUT), 1 = rear (IN)
    const tcpServer = global.tcpServer;
    
    if (!tcpServer) {
      return res.status(500).json({
        success: false,
        message: 'TCP Server not initialized'
      });
    }
    
    // Duration 2–180 min per JC261 spec; default 15. Use 180 for "not limited".
    let dur = typeof durationMinutes === 'number' ? durationMinutes : parseInt(durationMinutes, 10);
    if (Number.isNaN(dur) || dur < 2) dur = 15;
    if (dur > 180) dur = 180;

    // Determine protocol handler to adjust stream path for PL601 (single /live path)
    const handler = await tcpServer.getProtocolHandler(imei);
    const model = handler.getDeviceModel();
    const isPL601 = model === 'PL601';
    
    const publicRtmpHost = process.env.RTMP_PUBLIC_HOST || 'bore.pub';
    const publicRtmpPort = process.env.RTMP_PUBLIC_PORT || '22797';
    
    // Prepare URLs
    let rtmpUrlForDevice;
    let hlsPath;
    
    if (isPL601) {
      rtmpUrlForDevice = rtmpUrl || `rtmp://${publicRtmpHost}:${publicRtmpPort}/live`;
      hlsPath = 'live';
    } else {
      // JC261: Device appends /Channel/IMEI automatically to the RSERVICE URL
      // So we must send the BASE URL (e.g. .../live)
      rtmpUrlForDevice = rtmpUrl || `rtmp://${publicRtmpHost}:${publicRtmpPort}/live`;
      hlsPath = `live/${cameraIndex}/${imei}`;
    }

    const computedRtmpUrl = rtmpUrlForDevice;
    
    console.log(`📡 Sending RTMP URL to device: ${computedRtmpUrl}`);
    console.log(`📡 HLS Path: ${hlsPath}`);

    // Check if device is connected to the TCP server
    const isConnected = tcpServer.activeConnections && tcpServer.activeConnections.has(imei);
    const activeIMEIs = tcpServer.activeConnections ? Array.from(tcpServer.activeConnections.keys()) : [];
    
    console.log(`🔍 Start RTMP request for IMEI: ${imei}`);
    console.log(`📋 Active connections: ${activeIMEIs.join(', ')}`);
    console.log(`✅ Device connected: ${isConnected}`);

    /**
     * ⚠️ IMPORTANT:
     * In many dev setups (or when AUTO_START_RTMP_ON_CONNECT is enabled), the RTMP/HLS
     * stream might already be running even if the TCP tracker connection is not present
     * in this process (for example when MediaMTX is fed by another service or a previous
     * command).
     *
     * To avoid breaking the frontend UX with a 404, we now ALWAYS return a successful
     * response with a computed HLS URL. When the device is not connected, we simply
     * skip sending RSERVICE/RTMP commands and mark `deviceConnected: false`.
     *
     * The frontend can still attempt to play the stream; if there is really no RTMP
     * publisher, HLS.js will surface a playback error and the player UI will show
     * "Stream error", which is the correct behaviour.
     */
    if (!isConnected) {
      const serverIp = process.env.SERVER_IP || '98.70.101.16';
      const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';

      const publicHlsBase = process.env.MEDIAMTX_HLS_PUBLIC_URL || '';
      let hlsStreamUrl;
      if (publicHlsBase) {
        const base = publicHlsBase.replace(/\/$/, '');
        hlsStreamUrl = `${base}/${hlsPath}/index.m3u8`;
      } else {
        const reqHost = (req.hostname || '').toLowerCase();
        const origin = (req.headers.origin || '').toLowerCase();
        const isLocalhost = reqHost === 'localhost' || reqHost === '127.0.0.1' ||
                           origin.includes('localhost') || origin.includes('127.0.0.1');
        const hlsHost = isLocalhost ? 'localhost' : serverIp;
        hlsStreamUrl = `http://${hlsHost}:${hlsPort}/${hlsPath}/index.m3u8`;
      }

      console.log('⚠️ Device reported as NOT connected to TCP server.');
      console.log(`   Returning computed HLS URL anyway so UI can attempt playback: ${hlsStreamUrl}`);

      return res.json({
        success: true,
        message: `Device not connected to TCP server; assuming RTMP/HLS is managed externally or already running.`,
        deviceConnected: false,
        cameraIndex,
        channel: cameraIndex + 1,
        durationMinutes: dur,
        commandsSent: [],
        streamUrl: hlsStreamUrl,
        hlsUrl: hlsStreamUrl,
        rtmpUrl: computedRtmpUrl,
        activeDevices: activeIMEIs
      });
    }
    
    const success = await tcpServer.startRTMPStream(imei, computedRtmpUrl, cameraIndex, dur);

    console.log(`📤 RTMP start result: ${success}`);

    if (success) {
      const serverIp = process.env.SERVER_IP || '98.70.101.16';
      const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';
      const rtmpStreamUrl = computedRtmpUrl;
      const cameraMode = cameraIndex === 0 ? 'OUT' : (cameraIndex === 1 ? 'IN' : 'INOUT');

      console.log('');
      console.log('========== RSERVICE COMMAND SENT (0x80 TCP, NO SMS) ==========');
      console.log(`   IMEI: ${imei}`);
      console.log(`   Command: RSERVICE,${rtmpStreamUrl}#`);
      console.log('========== RTMP STREAM COMMAND SENT (0x80 TCP, NO SMS) ==========');
      console.log(`   IMEI: ${imei} | Duration: ${dur} min`);
      console.log(`   Command: RTMP,ON,${cameraMode},${dur}#`);
      console.log('');

      const publicHlsBase = process.env.MEDIAMTX_HLS_PUBLIC_URL || '';
      let hlsStreamUrl;
      if (publicHlsBase) {
        const base = publicHlsBase.replace(/\/$/, '');
        hlsStreamUrl = `${base}/${hlsPath}/index.m3u8`;
      } else {
        const reqHost = (req.hostname || '').toLowerCase();
        const origin = (req.headers.origin || '').toLowerCase();
        const isLocalhost = reqHost === 'localhost' || reqHost === '127.0.0.1' ||
                           origin.includes('localhost') || origin.includes('127.0.0.1');
        const hlsHost = isLocalhost ? 'localhost' : serverIp;
        hlsStreamUrl = `http://${hlsHost}:${hlsPort}/${hlsPath}/index.m3u8`;
      }
      
      console.log(`📺 Generated HLS URL: ${hlsStreamUrl}`);

      res.json({
        success: true,
        message: 'RTMP commands sent to device via 0x80 TCP packet (no SMS required)',
        deviceConnected: true,
        cameraIndex: cameraIndex,
        channel: cameraIndex + 1,
        durationMinutes: dur,
        commandsSent: [
          `RSERVICE,${rtmpStreamUrl}#`,
          `RTMP,ON,${cameraMode},${dur}#`
        ],
        streamUrl: hlsStreamUrl,
        hlsUrl: hlsStreamUrl,
        rtmpUrl: rtmpStreamUrl
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send RTMP commands. Device handler may be mis-detected or device may not be connected.',
        deviceConnected: isConnected
      });
    }
  } catch (error) {
    console.error('Error in start-rtmp endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start RTMP stream',
      error: error.message
    });
  }
});

// POST stop RTMP stream for device
router.post('/:imei/stop-rtmp', async (req, res) => {
  try {
    const { imei } = req.params;
    const tcpServer = global.tcpServer;

    if (!tcpServer) {
      return res.status(500).json({
        success: false,
        message: 'TCP Server not initialized'
      });
    }

    const success = await tcpServer.stopRTMPStream(imei);

    if (success) {
      console.log(`📤 Stop RTMP result for ${imei}: RTMP,OFF# sent via 0x80 (no SMS)`);
      res.json({
        success: true,
        message: 'RTMP stream stop command sent to device'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Device not connected'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to stop RTMP stream',
      error: error.message
    });
  }
});

router.post('/test/add', async (req, res) => {
  try {
    const testDevices = [
      { imei: '862798051058358', name: 'Test Device 1' },
      { imei: '862798051058359', name: 'Test Device 2' },
      { imei: '862798051058360', name: 'Test Device 3' }
    ];

    const results = [];

    for (const dev of testDevices) {
      const existing = await deviceModel.getDeviceByIMEI(dev.imei);
      
      if (!existing) {
        const device = await deviceModel.createDevice({
          imei: dev.imei,
          deviceName: dev.name,
          deviceModel: 'JC261',
          status: 'active'
        });
        results.push(device);
      } else {
        await deviceModel.updateDeviceStatus(dev.imei, 'active');
        results.push(existing);
      }
    }

    res.json({
      success: true,
      message: 'Test devices added',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
