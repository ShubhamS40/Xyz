import net from 'net';
import deviceModel from '../model/deviceModel.js';
import prisma from '../config/database.js';
import JC261Protocol from './jc261/jc261.js';

class TCPServer {
  constructor(port) {
    this.port = port;
    this.server = null;
    this.activeConnections = new Map();
    this.deviceProtocols = new Map(); // Map IMEI to protocol handler
    this.crcMethod = null;
    this.calculateCRC = null;
    this.lastStatusUpdates = new Map();
    /** IMEIs we've already auto-sent RSERVICE+RTMP this process (avoid duplicate on reconnect) */
    this.autoStartedRTMP = new Set();
    
    // Test and initialize CRC method (this will also initialize protocol handlers)
    this.initializeCRC();
  }

  /**
   * Calculate CRC-16/ITU (CRC-16/X-25, CRC-16/IBM)
   * Polynomial: 0x1021, Initial: 0xFFFF, RefIn: True, RefOut: True, XorOut: 0xFFFF
   */
  calculateCrcITU(data) {
    let crc = 0xFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 0x0001) {
          crc = (crc >> 1) ^ 0x8408; // 0x8408 is reversed 0x1021
        } else {
          crc = crc >> 1;
        }
      }
    }
    return (crc ^ 0xFFFF) & 0xFFFF;
  }

  /**
   * Simple checksum - sum all bytes and take lower 16 bits
   */
  calculateCrcSimpleSum(data) {
    let total = 0;
    for (let i = 0; i < data.length; i++) {
      total += data[i];
    }
    return total & 0xFFFF;
  }

  /**
   * XOR-based checksum with addition
   */
  calculateCrcXorSum(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc = (crc + data[i]) & 0xFFFF;
    }
    return crc;
  }

  /**
   * Test multiple CRC algorithms to find the correct one
   */
  testAllCRCMethods() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTING MULTIPLE CRC ALGORITHMS');
    console.log('='.repeat(70));

    const testData = Buffer.from([0x05, 0x01, 0x00, 0x04]);
    const expected = 0x8E71;

    console.log(`Test data: ${testData.toString('hex').toUpperCase().match(/../g).join(' ')}`);
    console.log(`Expected CRC: ${expected.toString(16).toUpperCase().padStart(4, '0')}`);
    console.log('-'.repeat(70));

    // Test Method 1: CRC-16/ITU
    const crc1 = this.calculateCrcITU(testData);
    const match1 = crc1 === expected ? '✅ MATCH!' : '❌';
    console.log(`Method 1 (CRC-16/ITU):     ${crc1.toString(16).toUpperCase().padStart(4, '0')} ${match1}`);

    // Test Method 2: Simple Sum
    const crc2 = this.calculateCrcSimpleSum(testData);
    const match2 = crc2 === expected ? '✅ MATCH!' : '❌';
    console.log(`Method 2 (Simple Sum):     ${crc2.toString(16).toUpperCase().padStart(4, '0')} ${match2}`);

    // Test Method 3: XOR Sum
    const crc3 = this.calculateCrcXorSum(testData);
    const match3 = crc3 === expected ? '✅ MATCH!' : '❌';
    console.log(`Method 3 (XOR Sum):        ${crc3.toString(16).toUpperCase().padStart(4, '0')} ${match3}`);

    // Test Method 4: Full packet
    const fullPacket = Buffer.from([0x78, 0x78, 0x05, 0x01, 0x00, 0x04]);
    const crc4 = this.calculateCrcITU(fullPacket);
    const match4 = crc4 === expected ? '✅ MATCH!' : '❌';
    console.log(`Method 4 (Full packet):    ${crc4.toString(16).toUpperCase().padStart(4, '0')} ${match4}`);

    // Test Method 5: Without start bytes
    const noStart = Buffer.from([0x05, 0x01, 0x00, 0x04]);
    const crc5 = this.calculateCrcITU(noStart);
    const match5 = crc5 === expected ? '✅ MATCH!' : '❌';
    console.log(`Method 5 (No start ITU):   ${crc5.toString(16).toUpperCase().padStart(4, '0')} ${match5}`);

    console.log('='.repeat(70) + '\n');

    // Return the method that works
    if (crc1 === expected) {
      return { method: 1, func: this.calculateCrcITU.bind(this) };
    } else if (crc2 === expected) {
      return { method: 2, func: this.calculateCrcSimpleSum.bind(this) };
    } else if (crc3 === expected) {
      return { method: 3, func: this.calculateCrcXorSum.bind(this) };
    } else {
      console.log('⚠️  WARNING: No CRC method matched! Using ITU as default.');
      return { method: 1, func: this.calculateCrcITU.bind(this) };
    }
  }

  /**
   * Initialize CRC calculation method
   */
  initializeCRC() {
    const result = this.testAllCRCMethods();
    this.crcMethod = result.method;
    this.calculateCRC = result.func;
    console.log(`✅ Using CRC Method ${this.crcMethod}\n`);
    
    // Initialize protocol handler with CRC function
    this.jc261Handler = new JC261Protocol(
      this.calculateCRC.bind(this),
      this.encodeIMEI.bind(this)
    );
  }

  /**
   * Encode IMEI to BCD format (8 bytes)
   */
  encodeIMEI(imei) {
    // Ensure IMEI is 15 digits
    const imeiStr = imei.toString().padStart(15, '0').slice(0, 15);
    
    const buffer = Buffer.alloc(8);
    
    // Convert each pair of digits to BCD
    for (let i = 0; i < 8; i++) {
      const digit1 = parseInt(imeiStr[i * 2] || '0', 10);
      const digit2 = parseInt(imeiStr[i * 2 + 1] || '0', 10);
      buffer[i] = (digit1 << 4) | digit2;
    }
    
    return buffer;
  }

  /**
   * Get protocol handler for device (JC261 only)
   */
  async getProtocolHandler(imei) {
    // Check if we already have the handler cached
    if (this.deviceProtocols.has(imei)) {
      return this.deviceProtocols.get(imei);
    }

    try {
      // Try to get device from database to verify model
      const device = await deviceModel.getDeviceByIMEI(imei);
      
      if (device && device.deviceModel) {
        const model = device.deviceModel.toUpperCase();
        if (!model.includes('JC261')) {
          console.log(`⚠️  Device ${imei} model is ${model}, but only JC261 is supported`);
        }
      }
      
      // Cache the handler
      this.deviceProtocols.set(imei, this.jc261Handler);
      return this.jc261Handler;
    } catch (error) {
      console.error(`❌ Error getting protocol handler for ${imei}:`, error.message);
      return this.jc261Handler;
    }
  }

  /**
   * Handle incoming packet and route to JC261 protocol handler
   */
  async handlePacket(data, socket, deviceIMEI) {
    // If deviceIMEI is null (first packet), try to decode login
    if (!deviceIMEI && data.length >= 20 && data[0] === 0x78 && data[1] === 0x78 && data[3] === 0x01) {
      console.log('🔍 Unknown device - decoding login packet...');
      
      const jc261Login = this.jc261Handler.decodeLogin(data);

      if (jc261Login && jc261Login.imei) {
        console.log(`✅ Detected JC261 device: ${jc261Login.imei}`);
        this.deviceProtocols.set(jc261Login.imei, this.jc261Handler);
        return await this.jc261Handler.handlePacket(data, socket, null);
      }
      
      console.log('❌ Could not determine protocol from packet');
      return null;
    }

    // For non-login packets or when IMEI is known, get the cached handler
    if (deviceIMEI && this.deviceProtocols.has(deviceIMEI)) {
      const handler = this.deviceProtocols.get(deviceIMEI);
      return await handler.handlePacket(data, socket, deviceIMEI);
    }
    
    // Get protocol handler for this device (IMEI is known but not cached)
    const handler = await this.getProtocolHandler(deviceIMEI);

    // Route packet to handler
    return await handler.handlePacket(data, socket, deviceIMEI);
  }

  /**
   * Start the TCP server
   */
  start() {
    this.server = net.createServer((socket) => {
      const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
      
      console.log('\n' + '='.repeat(70));
      console.log(`🔌 Device Connected: ${clientAddress}`);
      console.log(`⏰ Time: ${new Date().toLocaleString()}`);
      console.log('='.repeat(70));

      let deviceIMEI = null;
      let deviceModelType = null;
      let buffer = Buffer.alloc(0);
      let dataReceived = false;

      // Add timeout to detect if device connects but doesn't send data
      const connectionTimeout = setTimeout(() => {
        if (!dataReceived) {
          console.log('⚠️  WARNING: Device connected but no data received after 5 seconds');
          console.log('   This could mean:');
          console.log('   1. Device is waiting for server response');
          console.log('   2. Device is not configured correctly');
          console.log('   3. Network/firewall issue');
          console.log('   4. Device uses different protocol\n');
        }
      }, 5000);

      socket.on('data', async (data) => {
        dataReceived = true;
        clearTimeout(connectionTimeout);
        try {
          // Log raw data (condensed format)
          if (data.length > 0) {
            const hexData = data.toString('hex').toUpperCase();
            const hexPreview = hexData.match(/../g)?.slice(0, 20).join(' ') || hexData.substring(0, 40);
            console.log(`📥 Received: ${data.length} bytes | HEX: ${hexPreview}${data.length > 20 ? '...' : ''}`);
          }
          
          buffer = Buffer.concat([buffer, data]);

          // Main packet processing loop
          while (buffer.length > 0) {
            // Process binary packets
            if (buffer.length < 10) {
              // Not enough data for binary packet
              break;
            }
            
            // Check for start marker (78 78 or 79 79)
            if (!((buffer[0] === 0x78 && buffer[1] === 0x78) || (buffer[0] === 0x79 && buffer[1] === 0x79))) {
              // Find next start marker
              let startIdx = -1;
              for (let i = 1; i < buffer.length - 1; i++) {
                if ((buffer[i] === 0x78 && buffer[i + 1] === 0x78) || 
                    (buffer[i] === 0x79 && buffer[i + 1] === 0x79)) {
                  startIdx = i;
                  break;
                }
              }
              
              if (startIdx > 0) {
                buffer = buffer.slice(startIdx);
                continue;
              } else {
                // No binary packet found
                break;
              }
            }

            // 79 79 uses 2-byte length (JT/T 808 style); 78 78 uses 1-byte length
            let packetLength;
            let totalPacketSize;
            if (buffer[0] === 0x79 && buffer[1] === 0x79 && buffer.length >= 4) {
              packetLength = buffer.readUInt16BE(2);
              totalPacketSize = 2 + 2 + packetLength + 2 + 2; // Start(2) + Len(2) + Data + CRC(2) + 0D0A(2)
              if (packetLength < 1 || packetLength > 500) {
                console.log(`⚠️ 79 79 packet: 2-byte length ${packetLength} out of range, skipping 4 bytes`);
                buffer = buffer.slice(4);
                continue;
              }
            } else {
              packetLength = buffer[2];
              totalPacketSize = 2 + 1 + packetLength + 2; // 78 78: Start(2) + Length(1) + Data + Stop(2)
              if (packetLength < 3 || packetLength > 200) {
                if (buffer[0] === 0x79 && buffer[1] === 0x79) {
                  console.log(`⚠️ 79 79 packet: 1-byte length ${packetLength} invalid (try 2-byte?); skipping 4 bytes`);
                  buffer = buffer.length >= 4 ? buffer.slice(4) : buffer.slice(2);
                } else {
                  console.log(`❌ Invalid packet length: ${packetLength}, discarding...`);
                  buffer = buffer.slice(1);
                }
                continue;
              }
            }

            if (buffer.length < totalPacketSize) {
              // Wait for more data
              break;
            }

            // Extract one complete packet
            const packet = buffer.slice(0, totalPacketSize);
            buffer = buffer.slice(totalPacketSize);

            // Parse the packet using JC261 handler
            const parsedData = await this.handlePacket(packet, socket, deviceIMEI);

            // Handle device registration/update ONLY on login (protocol 0x01)
            if (parsedData && parsedData.imei && parsedData.type === 'login') {
              deviceIMEI = parsedData.imei;
              this.activeConnections.set(deviceIMEI, socket);

              // Get protocol handler to determine device model
              const handler = await this.getProtocolHandler(deviceIMEI);
              deviceModelType = handler.getDeviceModel();

              // Handle device registration/update in database ONLY on login
              if (deviceModel) {
                try {
                  let device = await deviceModel.getDeviceByIMEI(deviceIMEI);
                  const currentTime = new Date();

                  if (!device) {
                    // Use protocol handler's default device name format
                    const defaultName = handler.getDefaultDeviceName(deviceIMEI);
                    
                    device = await deviceModel.createDevice({
                      imei: deviceIMEI,
                      deviceName: defaultName,
                      deviceModel: deviceModelType,
                      status: 'online',
                      activationDate: currentTime,
                      ipAddress: socket.remoteAddress.replace('::ffff:', ''),
                      serverIp: socket.localAddress,
                      serverPort: parseInt(this.port),
                      lastSeen: currentTime
                    });
                    console.log(`✅ New ${deviceModelType} device registered and activated: ${deviceIMEI}`);
                  } else {
                    // Update status to online and set activation date if not set
                    const updateData = {
                      status: 'online',
                      lastSeen: currentTime,
                      ipAddress: socket.remoteAddress.replace('::ffff:', '')
                    };
                    
                    // Update device model if it changed
                    if (device.deviceModel !== deviceModelType) {
                      updateData.deviceModel = deviceModelType;
                    }
                    
                    // Set activation date on first log/connection if not already set
                    if (!device.activationDate) {
                      updateData.activationDate = currentTime;
                      console.log(`🎉 ${deviceModelType} Device ${deviceIMEI} activated (first log)`);
                    }
                    
                    await prisma.device.update({
                      where: { imei: deviceIMEI },
                      data: updateData
                    });
                    console.log(`✅ ${deviceModelType} Device status updated to online (login): ${deviceIMEI}`);
                  }

                  // Log connection only on login
                  if (device) {
                    await deviceModel.addDeviceLog(
                      device.id,
                      'connected',
                      socket.remoteAddress.replace('::ffff:', ''),
                      `Protocol: ${parsedData.type}, Model: ${deviceModelType}`
                    );
                  }
                } catch (error) {
                  console.error(`❌ Error handling device registration:`, error.message);
                }
              }

              // 🔥🔥🔥 CRITICAL FIX: CHANGED FROM 0 TO 'INOUT' FOR DUAL CAMERA 🔥🔥🔥
              // RSERVICE + RTMP auto-start for JC261
              const auto = process.env.AUTO_START_RTMP_ON_CONNECT === 'true';
              console.log('');
              console.log('📡 RSERVICE+RTMP: Video → Live or POST /api/devices/' + deviceIMEI + '/start-rtmp');
              console.log('   JC261: 0x80 TCP only (no SMS).');
              console.log('   Auto-send on connect: ' + (auto ? 'ON' : 'OFF'));
              console.log('');
              if (auto && !this.autoStartedRTMP.has(deviceIMEI)) {
                this.autoStartedRTMP.add(deviceIMEI);
                console.log('🔄 AUTO_START_RTMP: Sending RSERVICE + RTMP (0x80) for ' + deviceIMEI + ' in 2.5s...');
                const imei = deviceIMEI;
                setTimeout(() => {
                  // ✅✅✅ THE FIX: Changed from 0 to 'INOUT' for BOTH cameras ✅✅✅
                  this.startRTMPStream(imei, null, 'INOUT', 15).then(() => {
                    console.log('✅ AUTO_START_RTMP: RSERVICE + RTMP sent for ' + imei);
                  }).catch((e) => {
                    console.error('❌ AUTO_START_RTMP failed for ' + imei + ':', e && e.message ? e.message : e);
                  });
                }, 2500);
              }
            } else if (parsedData && parsedData.imei && !deviceIMEI) {
              // Set deviceIMEI for tracking, but don't update database
              deviceIMEI = parsedData.imei;
              this.activeConnections.set(deviceIMEI, socket);
            }

            // Save location data if available and update activation/status
            if (parsedData && parsedData.type === 'location' && deviceIMEI && deviceModel) {
              try {
                const device = await deviceModel.getDeviceByIMEI(deviceIMEI);
                if (device) {
                  const currentTime = new Date();
                  
                  // Save GPS data
                  await deviceModel.saveDeviceData(device.id, {
                    latitude: parsedData.lat,
                    longitude: parsedData.lon,
                    speed: parsedData.speed || 0,
                    accStatus: (parsedData.course & 0x0400) ? 1 : 0,
                    gnssType: 'GPS',
                    satellites: parsedData.satellites || 0,
                    signalStrength: 'Medium'
                  });

                  // Update activation date if not set (first log received)
                  // Update status to online (since we just received data) and last seen
                  const updateData = {
                    status: 'online',
                    lastSeen: currentTime
                  };
                  
                  if (!device.activationDate) {
                    updateData.activationDate = currentTime;
                    console.log(`🎉 Device ${deviceIMEI} activated (first location log)`);
                  }
                  
                  await prisma.device.update({
                    where: { imei: deviceIMEI },
                    data: updateData
                  });

                  // Only log occasionally to reduce console spam
                  if (Math.random() < 0.1) {
                    console.log(`💾 GPS data saved to database`);
                  }
                }
              } catch (error) {
                console.error(`❌ Error saving location data:`, error.message);
              }
            }

            // Update device status on heartbeat (throttled - max once per 30 seconds)
            if (parsedData && parsedData.type === 'heartbeat' && deviceIMEI && deviceModel) {
              const lastUpdate = this.lastStatusUpdates.get(deviceIMEI) || 0;
              const now = Date.now();
              
              // Only update if last update was more than 30 seconds ago
              if (now - lastUpdate > 30000) {
                try {
                  const device = await deviceModel.getDeviceByIMEI(deviceIMEI);
                  if (device) {
                    const currentTime = new Date();
                    
                    const updateData = {
                      status: 'online',
                      lastSeen: currentTime
                    };
                    
                    if (!device.activationDate) {
                      updateData.activationDate = currentTime;
                      console.log(`🎉 Device ${deviceIMEI} activated for the first time`);
                    }
                    
                    await prisma.device.update({
                      where: { imei: deviceIMEI },
                      data: updateData
                    });
                    
                    this.lastStatusUpdates.set(deviceIMEI, now);
                  }
                } catch (error) {
                  console.error(`❌ Error updating heartbeat status:`, error.message);
                }
              }
            }
            
            // Update device status and activation when receiving any data (first log)
            if (parsedData && deviceIMEI && deviceModel) {
              try {
                const device = await deviceModel.getDeviceByIMEI(deviceIMEI);
                if (device && !device.activationDate) {
                  // First log received - activate device
                  const currentTime = new Date();
                  await prisma.device.update({
                    where: { imei: deviceIMEI },
                    data: {
                      activationDate: currentTime,
                      status: 'online',
                      lastSeen: currentTime
                    }
                  });
                  console.log(`🎉 Device ${deviceIMEI} activated (first log received)`);
                } else if (device) {
                  // Update last seen and status based on time
                  const lastSeenTime = device.lastSeen ? new Date(device.lastSeen).getTime() : 0;
                  const now = Date.now();
                  const diffMinutes = (now - lastSeenTime) / (1000 * 60);
                  
                  // Update last seen and determine status
                  const currentTime = new Date();
                  // Device is online if data received within last 4 minutes
                  let status = diffMinutes <= 4 ? 'online' : 'offline';
                  
                  await prisma.device.update({
                    where: { imei: deviceIMEI },
                    data: {
                      lastSeen: currentTime,
                      status: status
                    }
                  });
                }
              } catch (error) {
                console.error(`❌ Error updating device activation/status:`, error.message);
              }
            }
          }

          // Clear buffer if too large (safety check)
          if (buffer.length > 4096) {
            console.log('⚠️  Buffer overflow, clearing');
            buffer = Buffer.alloc(0);
          }
        } catch (error) {
          console.error('\n' + '='.repeat(70));
          console.error('❌ ERROR PROCESSING DATA:');
          console.error(`   Message: ${error.message}`);
          console.error(`   Stack: ${error.stack}`);
          console.error(`   Buffer length: ${buffer.length} bytes`);
          if (buffer.length > 0) {
            const bufferHex = buffer.toString('hex').toUpperCase().match(/../g)?.join(' ') || '';
            console.error(`   Buffer hex: ${bufferHex.substring(0, 200)}${bufferHex.length > 200 ? '...' : ''}`);
          }
          console.error('='.repeat(70) + '\n');
          
          // Don't clear buffer completely - might have valid data
          // Only clear if buffer is suspiciously large
          if (buffer.length > 1000) {
            console.log('⚠️  Clearing large buffer due to error');
            buffer = Buffer.alloc(0);
          }
        }
      });

      socket.on('error', (error) => {
        console.error('\n' + '='.repeat(70));
        console.error(`❌ SOCKET ERROR for ${clientAddress}:`);
        console.error(`   ${error.message}`);
        console.error('='.repeat(70) + '\n');
      });

      socket.on('timeout', () => {
        console.log(`⏱️  Socket timeout for ${clientAddress}`);
      });

      socket.on('end', async () => {
        console.log('\n' + '='.repeat(70));
        console.log(`🔌 Device Disconnected: ${clientAddress}`);
        console.log('='.repeat(70) + '\n');

        if (deviceIMEI) {
          this.activeConnections.delete(deviceIMEI);
          this.deviceProtocols.delete(deviceIMEI);

          if (deviceModel) {
            try {
              const device = await deviceModel.getDeviceByIMEI(deviceIMEI);
              if (device) {
                // Update status to offline when disconnected
                await prisma.device.update({
                  where: { imei: deviceIMEI },
                  data: {
                    status: 'offline',
                    lastSeen: new Date()
                  }
                });
                
                await deviceModel.addDeviceLog(
                  device.id,
                  'disconnected',
                  socket.remoteAddress.replace('::ffff:', ''),
                  'Connection closed'
                );
              }
            } catch (error) {
              console.error('Error handling disconnect:', error);
            }
          }
        }
      });

      socket.on('error', (err) => {
        console.error(`❌ Socket error: ${err.message}`);
      });
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log('='.repeat(70));
      console.log('🛰️  JT808 GPS TRACKER SERVER (JC261)');
      console.log('='.repeat(70));
      console.log(`📡 Listening on 0.0.0.0:${this.port}...`);
      console.log('⏳ Waiting for device connection...');
      console.log('='.repeat(70));
    });

    this.server.on('error', (err) => {
      console.error('❌ Server error:', err);
    });
  }

  /**
   * Stop the TCP server
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('\n👋 Server stopped');
      });
    }
  }

  /**
   * Request location from device by IMEI
   */
  async requestLocation(imei) {
    const handler = await this.getProtocolHandler(imei);
    return handler.requestLocation(imei, this.activeConnections);
  }

  /**
   * Start RTMP streaming for a device (JC261 only)
   * ✅ DEFAULT CHANGED TO 'INOUT' FOR DUAL CAMERA
   */
  async startRTMPStream(imei, rtmpUrl = null, cameraIndex = 'INOUT', durationMinutes = 15) {
    try {
      if (!this.activeConnections || !this.activeConnections.has(imei)) {
        console.error(`❌ Device ${imei} not in active connections`);
        console.log(`📋 Active connections: ${Array.from(this.activeConnections?.keys() || []).join(', ')}`);
        return false;
      }

      const handler = await this.getProtocolHandler(imei);
      const result = handler.startRTMPStream(imei, rtmpUrl, cameraIndex, durationMinutes, this.activeConnections);
      console.log(`📤 RTMP start command result for ${imei}: ${result}`);
      return result;
    } catch (error) {
      console.error(`❌ Error in startRTMPStream for ${imei}:`, error);
      return false;
    }
  }

  /**
   * Stop RTMP streaming for a device (JC261 only)
   */
  async stopRTMPStream(imei) {
    const handler = await this.getProtocolHandler(imei);
    return handler.stopRTMPStream(imei, this.activeConnections);
  }

  /**
   * Send command to device by IMEI
   */
  async sendCommandToDevice(imei, commandType) {
    const handler = await this.getProtocolHandler(imei);
    console.log(`📤 Sending ${commandType} command to JC261 device ${imei}`);
    return true;
  }
}

export default TCPServer;