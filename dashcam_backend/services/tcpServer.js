import net from 'net';
import deviceModel from '../model/deviceModel.js';
import prisma from '../config/database.js';
import JC261Protocol from './jc261/jc261.js';
import PL601Protocol from './pl601/pl601.js';

class TCPServer {
  constructor(port) {
    this.port = port;
    this.server = null;
    this.activeConnections = new Map();
    this.deviceProtocols = new Map(); // Map IMEI to protocol handler
    this.crcMethod = null;
    this.calculateCRC = null;
    // Track last status update time per device to throttle updates
    this.lastStatusUpdates = new Map();
    
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
    
    // Re-initialize protocol handlers with CRC function
    this.jc261Handler = new JC261Protocol(
      this.calculateCRC.bind(this),
      this.encodeIMEI.bind(this)
    );
    this.pl601Handler = new PL601Protocol(
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
   * Get protocol handler for device based on device model
   */
  async getProtocolHandler(imei) {
    // Check if we already have the handler cached
    if (this.deviceProtocols.has(imei)) {
      const cached = this.deviceProtocols.get(imei);
      // If cache is wrong (can happen when CRC invalid and PL601 mis-detected),
      // prefer the device model stored in DB for command sending.
      try {
        const device = await deviceModel.getDeviceByIMEI(imei);
        const model = device?.deviceModel ? device.deviceModel.toUpperCase() : '';
        if (model.includes('JC261') && cached?.getDeviceModel?.() !== 'JC261') {
          this.deviceProtocols.set(imei, this.jc261Handler);
          return this.jc261Handler;
        }
        if (model.includes('PL601') && cached?.getDeviceModel?.() !== 'PL601') {
          this.deviceProtocols.set(imei, this.pl601Handler);
          return this.pl601Handler;
        }
      } catch (e) {
        // ignore DB issues and keep cached
      }
      return cached;
      }

    try {
      // Try to get device from database to determine model
      const device = await deviceModel.getDeviceByIMEI(imei);
      
      let handler;
      if (device && device.deviceModel) {
        const model = device.deviceModel.toUpperCase();
        if (model.includes('PL601')) {
          handler = this.pl601Handler;
        } else if (model.includes('JC261')) {
          handler = this.jc261Handler;
        } else {
          // Default to JC261 for unknown models
          handler = this.jc261Handler;
        }
      } else {
        // Default to JC261 if device not found
        handler = this.jc261Handler;
      }
      
      // Cache the handler
      this.deviceProtocols.set(imei, handler);
      return handler;
    } catch (error) {
      console.error(`❌ Error getting protocol handler for ${imei}:`, error.message);
      // Default to JC261 on error
      return this.jc261Handler;
    }
  }

  /**
   * Handle incoming packet and route to appropriate protocol handler
   */
  async handlePacket(data, socket, deviceIMEI) {
    // If deviceIMEI is null (first packet), try to detect protocol by decoding login
    if (!deviceIMEI && data.length >= 20 && data[0] === 0x78 && data[1] === 0x78 && data[3] === 0x01) {
      console.log('🔍 Unknown device - detecting protocol from login packet...');
      
      // Try decoding with both handlers (without sending ACK yet)
      const pl601Login = this.pl601Handler.decodeLogin(data);
      const jc261Login = this.jc261Handler.decodeLogin(data);

      // Determine which handler successfully decoded
      let handler = null;
      if (pl601Login && pl601Login.imei && pl601Login.crcValid) {
        console.log(`✅ Detected PL601 device: ${pl601Login.imei}`);
        handler = this.pl601Handler;
        // Cache the handler
        this.deviceProtocols.set(pl601Login.imei, handler);
      } else if (jc261Login && jc261Login.imei && jc261Login.crcValid) {
        console.log(`✅ Detected JC261 device: ${jc261Login.imei}`);
        handler = this.jc261Handler;
        // Cache the handler
        this.deviceProtocols.set(jc261Login.imei, handler);
      } else if (pl601Login && pl601Login.imei) {
        // PL601 decoded but CRC invalid - still use it
        console.log(`⚠️  Detected PL601 device (CRC invalid): ${pl601Login.imei}`);
        handler = this.pl601Handler;
        this.deviceProtocols.set(pl601Login.imei, handler);
      } else if (jc261Login && jc261Login.imei) {
        // JC261 decoded but CRC invalid - still use it
        console.log(`⚠️  Detected JC261 device (CRC invalid): ${jc261Login.imei}`);
        handler = this.jc261Handler;
        this.deviceProtocols.set(jc261Login.imei, handler);
  }

      // If we determined the handler, use it to process the packet (will send ACK)
      if (handler) {
        return await handler.handlePacket(data, socket, null);
      }
      
      // If still unknown, try PL601 first (handles text responses too)
      console.log('⚠️  Could not determine protocol - trying PL601 handler...');
      const pl601Result = await this.pl601Handler.handlePacket(data, socket, null);
      if (pl601Result && pl601Result.imei) {
        this.deviceProtocols.set(pl601Result.imei, this.pl601Handler);
        return pl601Result;
      }

      // Try JC261 as fallback
      console.log('⚠️  Trying JC261 handler...');
      const jc261Result = await this.jc261Handler.handlePacket(data, socket, null);
      if (jc261Result && jc261Result.imei) {
        this.deviceProtocols.set(jc261Result.imei, this.jc261Handler);
        return jc261Result;
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

    // Route packet to device-specific handler
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
      let connectionStartTime = Date.now();

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

          // Main packet processing loop - handles both text and binary packets
          while (buffer.length > 0) {
            // Check if this might be a text/SMS response (PL601 devices)
            // Text responses don't start with 0x78 0x78, they're plain ASCII/UTF-8
            const isBinaryPacket = buffer.length >= 2 && 
                                   ((buffer[0] === 0x78 && buffer[1] === 0x78) || 
                                    (buffer[0] === 0x79 && buffer[1] === 0x79));
            
            if (!isBinaryPacket) {
              // This might be a text response - check if we have a complete text message
              // Text messages typically end with newline, #, or are complete when we have enough data
              
              // Look for common text message terminators
              const newlineIdx = buffer.indexOf(0x0A); // \n
              const hashIdx = buffer.indexOf(0x23); // #
              const crIdx = buffer.indexOf(0x0D); // \r
              
              let endIdx = -1;
              if (newlineIdx >= 0) endIdx = newlineIdx + 1;
              else if (crIdx >= 0) endIdx = crIdx + 1;
              else if (hashIdx >= 0) endIdx = hashIdx + 1;
              else if (buffer.length > 200) {
                // If buffer is getting large and no terminator, process what we have
                endIdx = buffer.length;
              }
              
              if (endIdx > 0) {
                // Extract text packet
                const textPacket = buffer.slice(0, endIdx);
                buffer = buffer.slice(endIdx);
                
                // Try to process as text (PL601 handler can handle this)
                // If deviceIMEI is known, use cached handler, otherwise try PL601
                if (deviceIMEI && this.deviceProtocols.has(deviceIMEI)) {
                  const handler = this.deviceProtocols.get(deviceIMEI);
                  const result = await handler.handlePacket(textPacket, socket, deviceIMEI);
                  if (result) continue; // Processed successfully, continue loop
                } else {
                  // Try PL601 handler (handles text responses)
                  const result = await this.pl601Handler.handlePacket(textPacket, socket, deviceIMEI);
                  if (result && result.imei && !deviceIMEI) {
                    deviceIMEI = result.imei;
                    this.deviceProtocols.set(deviceIMEI, this.pl601Handler);
                    this.activeConnections.set(deviceIMEI, socket);
                  }
                  if (result) continue; // Processed successfully, continue loop
                }
                
                // If text processing failed, continue to binary packet processing
              } else {
                // Not enough data for text packet or no terminator found
                // Try to find binary start marker
                let startIdx = -1;
                for (let i = 0; i < buffer.length - 1; i++) {
                  if ((buffer[i] === 0x78 && buffer[i + 1] === 0x78) || 
                      (buffer[i] === 0x79 && buffer[i + 1] === 0x79)) {
                    startIdx = i;
                    break;
  }
                }
                
                if (startIdx > 0) {
                  // Found binary start, discard text before it
                  buffer = buffer.slice(startIdx);
                  // Continue loop to process binary packet
                } else if (buffer.length > 500) {
                  // Buffer too large, clear it to prevent memory issues
                  console.log('⚠️  Clearing large buffer (no valid packet found)');
                  buffer = Buffer.alloc(0);
                  break;
                } else {
                  // Wait for more data
                  break;
                }
              }
            }

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
                // No binary packet found - might be text, break to let text handler try
                break;
              }
            }

            const packetLength = buffer[2];
            
            // Validate packet length
            if (packetLength < 3 || packetLength > 200) {
              console.log(`❌ Invalid packet length: ${packetLength}, discarding...`);
              buffer = buffer.slice(1);
              continue;
            }
            
            // Total packet size: Start(2) + Length(1) + Data(packetLength) + Stop(2) = 5 + packetLength
            const totalPacketSize = 2 + 1 + packetLength + 2;

            if (buffer.length < totalPacketSize) {
              // Wait for more data
              break;
            }

            // Extract one complete packet
            const packet = buffer.slice(0, totalPacketSize);
            buffer = buffer.slice(totalPacketSize);

            // Parse the packet using device-specific handler
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
      console.log('🛰️  JT808 GPS TRACKER SERVER (MULTI-PROTOCOL)');
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
   * Start RTMP streaming for a device
   */
  async startRTMPStream(imei, rtmpUrl = null, cameraIndex = 0) {
    try {
      // First check if device is connected
      if (!this.activeConnections || !this.activeConnections.has(imei)) {
        console.error(`❌ Device ${imei} not in active connections`);
        console.log(`📋 Active connections: ${Array.from(this.activeConnections?.keys() || []).join(', ')}`);
        return false;
      }

    const handler = await this.getProtocolHandler(imei);
      const deviceModel = handler.getDeviceModel();
      
      console.log(`🔍 Device ${imei} handler: ${deviceModel}`);
      console.log(`📋 Cached protocols: ${Array.from(this.deviceProtocols.keys()).map(k => `${k}=${this.deviceProtocols.get(k)?.getDeviceModel?.() || 'unknown'}`).join(', ')}`);
      
    // Only JC261 supports RTMP streaming
      if (deviceModel === 'JC261') {
        const result = handler.startRTMPStream(imei, rtmpUrl, cameraIndex, this.activeConnections);
        console.log(`📤 RTMP start command result for ${imei}: ${result}`);
        return result;
    } else {
        console.error(`❌ RTMP streaming not supported for ${deviceModel} devices`);
        // Force use JC261 handler if device model is unknown but device is connected
        // OR if handler was mis-detected as PL601 but device is actually JC261
        console.log(`⚠️  Attempting to use JC261 handler anyway for ${imei} (device is connected)`);
        // Override the cached handler to JC261
        this.deviceProtocols.set(imei, this.jc261Handler);
        return this.jc261Handler.startRTMPStream(imei, rtmpUrl, cameraIndex, this.activeConnections);
      }
    } catch (error) {
      console.error(`❌ Error in startRTMPStream for ${imei}:`, error);
      return false;
    }
  }

  /**
   * Stop RTMP streaming for a device
   */
  async stopRTMPStream(imei) {
    const handler = await this.getProtocolHandler(imei);
    
    // Only JC261 supports RTMP streaming
    if (handler.getDeviceModel() === 'JC261') {
      return handler.stopRTMPStream(imei, this.activeConnections);
    } else {
      console.error(`❌ RTMP streaming not supported for ${handler.getDeviceModel()} devices`);
      return false;
    }
  }

  /**
   * Send command to device by IMEI
   */
  async sendCommandToDevice(imei, commandType) {
    const handler = await this.getProtocolHandler(imei);
    console.log(`📤 Sending ${commandType} command to ${handler.getDeviceModel()} device ${imei}`);
      return true;
  }
}

export default TCPServer;
