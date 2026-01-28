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
    const { rtmpUrl, cameraIndex = 0 } = req.body; // cameraIndex: 0 = front, 1 = rear
    const tcpServer = global.tcpServer;
    
    if (!tcpServer) {
      return res.status(500).json({
        success: false,
        message: 'TCP Server not initialized'
      });
    }
    
    // Check if device is connected
    const isConnected = tcpServer.activeConnections && tcpServer.activeConnections.has(imei);
    const activeIMEIs = tcpServer.activeConnections ? Array.from(tcpServer.activeConnections.keys()) : [];
    
    console.log(`🔍 Start RTMP request for IMEI: ${imei}`);
    console.log(`📋 Active connections: ${activeIMEIs.join(', ')}`);
    console.log(`✅ Device connected: ${isConnected}`);
    
    if (!isConnected) {
      return res.status(404).json({
        success: false,
        message: `Device not connected. Please ensure device is online and connected to server. Active devices: ${activeIMEIs.length > 0 ? activeIMEIs.join(', ') : 'none'}`,
        deviceConnected: false,
        activeDevices: activeIMEIs
      });
    }
    
    const success = await tcpServer.startRTMPStream(imei, rtmpUrl, cameraIndex);
    
    console.log(`📤 RTMP start result: ${success}`);
    
    if (success) {
      const serverIp = process.env.SERVER_IP || '98.70.101.16';
      const rtmpPort = process.env.RTMP_PORT || '1935';
      // Your MediaMTX logs show HLS on 8888
      const hlsPort = process.env.MEDIAMTX_HLS_PORT || '8888';

      // Public RTMP host/port (for device to reach server) - supports bore/pub tunnel
      // Default to bore.pub:22797 to match your tunnel setup
      const publicRtmpHost = process.env.RTMP_PUBLIC_HOST || 'bore.pub';
      const publicRtmpPort = process.env.RTMP_PUBLIC_PORT || '22797';
      
      // MediaMTX path format: live/{cameraIndex}/{imei}
      const streamPath = `live/${cameraIndex}/${imei}`;
      // HLS is consumed by browser - use server IP or check origin header
      const reqHost = (req.hostname || '').toLowerCase();
      const origin = req.headers.origin || '';
      // If frontend is on localhost, use localhost for HLS; otherwise use server IP
      // Also check if origin contains localhost
      const isLocalhost = reqHost === 'localhost' || reqHost === '127.0.0.1' || 
                         origin.includes('localhost') || origin.includes('127.0.0.1');
      const hlsHost = isLocalhost ? 'localhost' : serverIp;
      const hlsStreamUrl = `http://${hlsHost}:${hlsPort}/${streamPath}/index.m3u8`;
      
      console.log(`📺 Generated HLS URL: ${hlsStreamUrl} (host: ${hlsHost}, port: ${hlsPort})`);

      // RTMP publish URL must be reachable by device (use tunnel host/port)
      const rtmpStreamUrl = rtmpUrl || `rtmp://${publicRtmpHost}:${publicRtmpPort}/${streamPath}`;
      
      res.json({
        success: true,
        message: 'RTMP commands sent to device via 0x80 TCP packet (no SMS required)',
        deviceConnected: true,
        cameraIndex: cameraIndex,
        channel: cameraIndex + 1, // CH1 = index 0, CH2 = index 1, etc.
        commandsSent: [
          `RSERVICE,${rtmpStreamUrl}#`,
          `RTMP,ON,INOUT,30#`
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
router.post('/:imei/stop-rtmp', (req, res) => {
  try {
    const { imei } = req.params;
    const tcpServer = global.tcpServer;
    
    if (!tcpServer) {
      return res.status(500).json({
        success: false,
        message: 'TCP Server not initialized'
      });
    }
    
    const success = tcpServer.stopRTMPStream(imei);
    
    if (success) {
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

