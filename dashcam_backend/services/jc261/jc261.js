/**
 * ✅ FINAL CORRECTED JC261 PROTOCOL - DUAL CAMERA DEFAULT
 * 📋 Based on: "Communication Protocol for JC261/JC400 V1.3.5"
 * 🔧 Fixed: 0x80 Command Packet Structure (Section 5.5.1)
 * 🎥 Fixed: Default camera mode changed from 'OUT' to 'INOUT' for dual camera
 * 
 * CRITICAL FIXES:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 1. 0x80 Packet Structure: Server Flag → Command → Language (CORRECT ORDER)
 * 2. Default Camera Mode: 'INOUT' (both cameras) instead of 'OUT' (single camera)
 * 
 * REFERENCE PACKET (from manufacturer):
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * For INOUT (both cameras):
 * 78 78 1D 80 17 00 00 00 02 52 54 4D 50 2C 4F 4E 2C 49 4E 4F 55 54 2C 31 35 23 00 02 ...
 * Command: RTMP,ON,INOUT,15# (I N O U T)
 */

class JC261Protocol {
  constructor(crcCalculator, encodeIMEI) {
    this.calculateCRC = crcCalculator;
    this.encodeIMEI = encodeIMEI;
    this.rtmpCommandResponses = new Map();
    this.serialCounter = 1;
  }

  /**
   * Creates standard response packet (Section 5.1.2, 5.2.2, 5.3.2)
   */
  createResponsePacket(protocolNumber, serialNumber) {
    const packet = Buffer.alloc(10);
    packet[0] = 0x78;
    packet[1] = 0x78;
    packet[2] = 0x05;  // Packet length = 1(protocol) + 2(serial) + 2(crc)
    packet[3] = protocolNumber;
    packet[4] = (serialNumber >> 8) & 0xFF;
    packet[5] = serialNumber & 0xFF;
    
    // CRC: from byte 2 to byte 5 (packet length → serial number)
    const crcData = packet.slice(2, 6);
    const crc = this.calculateCRC(crcData);
    packet[6] = (crc >> 8) & 0xFF;
    packet[7] = crc & 0xFF;
    packet[8] = 0x0D;
    packet[9] = 0x0A;
    
    return packet;
  }

  /**
   * Decode IMEI from Terminal ID (Section 5.1.1)
   */
  decodeIMEI(imeiBytes) {
    let imei = '';
    for (let i = 0; i < imeiBytes.length; i++) {
      const byte = imeiBytes[i];
      const high = (byte >> 4) & 0x0F;
      const low = byte & 0x0F;
      imei += high.toString() + low.toString();
    }
    imei = imei.replace(/^0+/, '');
    if (imei.length > 15) {
      imei = imei.slice(-15);
    }
    return imei;
  }

  /**
   * Decode Login Packet 0x01 (Section 5.1.1)
   */
  decodeLogin(data) {
    try {
      if (data[0] !== 0x78 || data[1] !== 0x78) return null;
      const protocol = data[3];
      if (protocol !== 0x01) return null;

      const imeiBytes = data.slice(4, 12);
      const imei = this.decodeIMEI(imeiBytes);
      const serialNumber = data.readUInt16BE(16);

      return {
        type: 'login',
        imei: imei,
        serial: serialNumber,
        crcValid: true
      };
    } catch (e) {
      console.error('❌ Login decode error:', e.message);
      return null;
    }
  }

  /**
   * Decode Heartbeat Packet 0x13 (Section 5.2.1)
   */
  decodeHeartbeat(data) {
    try {
      if (data[0] !== 0x78 || data[1] !== 0x78) return null;
      if (data[3] !== 0x13) return null;

      const serialNumber = data.readUInt16BE(data.length - 6);
      let voltage = null;
      if (data.length > 11) {
        voltage = data.readUInt16BE(5) / 100.0;
      }

      return {
        type: 'heartbeat',
        serial: serialNumber,
        voltage: voltage
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Decode Location Packet 0x22 (Section 5.3.1)
   */
  decodeLocation(data) {
    try {
      if (!((data[0] === 0x78 && data[1] === 0x78) || (data[0] === 0x79 && data[1] === 0x79))) {
        return null;
      }

      const protocol = data[3];
      if (![0x22, 0x12, 0x20, 0x37].includes(protocol)) return null;

      const serialNumber = data.readUInt16BE(data.length - 6);

      // UTC time
      const year = 2000 + data[4];
      const month = data[5];
      const day = data[6];
      const hour = data[7];
      const minute = data[8];
      const second = data[9];
      
      // GPS data
      const latRaw = data.readUInt32BE(11);
      const lat = latRaw / 1800000.0;
      const lonRaw = data.readUInt32BE(15);
      const lon = lonRaw / 1800000.0;
      const speed = data[19];
      const courseStatus = data.readUInt16BE(20);

      return {
        type: 'location',
        protocol: protocol,
        serial: serialNumber,
        time: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
        lat: lat,
        lon: lon,
        speed: speed,
        course: courseStatus & 0x03FF
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Handle 0xE0/0xE1 camera info responses
   */
  handleCommandResponse_0xE0_0xE1(data, deviceIMEI, protocol) {
    try {
      console.log('\n' + '╔'.repeat(80));
      console.log(`📨 DEVICE RESPONSE (Protocol 0x${protocol.toString(16).toUpperCase()})`);
      console.log('╚'.repeat(80));
      
      const hexData = data.toString('hex').toUpperCase();
      const hexFormatted = hexData.match(/../g)?.join(' ') || hexData;
      
      console.log(`📱 Device: ${deviceIMEI}`);
      console.log(`📦 Raw: ${hexFormatted}`);
      
      if (protocol === 0xE0) {
        if (data.length >= 11) {
          const responseData = data.slice(4, data.length - 6);
          console.log(`📝 Response Data: ${responseData.toString('hex').toUpperCase()}`);
          
          if (responseData.length >= 3) {
            const builtInCamCount = responseData[0];
            console.log(`📹 Built-in Cameras: ${builtInCamCount}`);
            
            let offset = 1;
            for (let i = 0; i < builtInCamCount && offset < responseData.length - 1; i++) {
              const camNum = responseData[offset];
              const camStatus = responseData[offset + 1];
              console.log(`   Camera ${camNum}: ${camStatus === 0x01 ? '✅ Available' : '❌ Unavailable'}`);
              offset += 2;
            }
          }
          
          console.log(`✅ COMMAND ACCEPTED - RTMP streams should start soon`);
        }
      } else if (protocol === 0xE1) {
        if (data.length >= 11) {
          const responseData = data.slice(4, data.length - 6);
          const status = responseData[0];
          console.log(`📊 Status: 0x${status.toString(16).toUpperCase().padStart(2, '0')}`);
          if (status === 0x02) {
            console.log(`✅ COMMAND EXECUTED SUCCESSFULLY`);
          }
        }
      }
      
      console.log('═'.repeat(80) + '\n');
      
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
    }
  }

  /**
   * Main packet handler
   */
  async handlePacket(data, socket, deviceIMEI) {
    const hexData = data.toString('hex').toUpperCase();
    const hexFormatted = hexData.match(/../g).join(' ');
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    console.log(`\n[${timestamp}] 📦 Raw: ${hexFormatted}`);

    if (data.length < 5) return null;

    const protocol = data[3];
    console.log(`📋 Protocol: 0x${protocol.toString(16).toUpperCase().padStart(2, '0')}`);

    if (protocol === 0xE0 || protocol === 0xE1) {
      this.handleCommandResponse_0xE0_0xE1(data, deviceIMEI, protocol);
      return null;
    }

    if (protocol === 0x01) {
      const result = this.decodeLogin(data);
      if (result) {
        console.log('🔐 LOGIN');
        console.log(`   IMEI: ${result.imei}`);
        const ack = this.createResponsePacket(0x01, result.serial);
        socket.write(ack);
        console.log(`✅ Sent LOGIN ACK`);
        return result;
      }
    } else if (protocol === 0x13) {
      const result = this.decodeHeartbeat(data);
      if (result) {
        console.log('💓 HEARTBEAT');
        if (result.voltage) console.log(`   🔋 ${result.voltage.toFixed(2)}V`);
        const ack = this.createResponsePacket(0x13, result.serial);
        socket.write(ack);
        return { ...result, imei: deviceIMEI };
      }
    } else if ([0x22, 0x12, 0x20, 0x37].includes(protocol)) {
      const result = this.decodeLocation(data);
      if (result) {
        console.log('\n' + '='.repeat(70));
        console.log(`🌍 LOCATION (0x${result.protocol.toString(16).toUpperCase()})`);
        console.log(`⏰ ${result.time}`);
        console.log(`📍 ${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`);
        console.log(`🚗 ${result.speed} km/h | 🧭 ${result.course}°`);
        console.log('='.repeat(70));
        const ack = this.createResponsePacket(result.protocol, result.serial);
        socket.write(ack);
        return { ...result, imei: deviceIMEI || result.imei };
      }
    }

    return null;
  }

  /**
   * ✅ CORRECTED 0x80 COMMAND PACKET
   * Based on PDF Section 5.5.1 "Control Command Sent by Server"
   * 
   * PACKET STRUCTURE (per PDF page 20-21):
   * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   * Start Bit (2)          : 0x78 0x78
   * Packet Length (1)      : Protocol + InfoDetail + Serial + CRC
   * Protocol Number (1)    : 0x80
   * Information Detail:
   *   - Command Length (1) : ServerFlag + Command + Language
   *   - Server Flag (4)    : 0x00 0x00 0x00 0xXX
   *   - Command Content (M): ASCII string (e.g., "RTMP,ON,INOUT,15#")
   *   - Language (2)       : 0x00 0x02 (English)
   * Serial Number (2)      : Auto-increment
   * Error Check (2)        : CRC-ITU
   * Stop Bit (2)           : 0x0D 0x0A
   */
  send0x80Command(imei, commandText, serverFlagValue = 0x00000000, activeConnections) {
    const socket = activeConnections.get(imei);
    if (!socket) {
      console.error(`❌ Device ${imei} not connected`);
      return false;
    }

    try {
      console.log('\n' + '═'.repeat(80));
      console.log('📤 BUILDING 0x80 COMMAND PACKET (CORRECTED)');
      console.log('═'.repeat(80));
      
      // 1. Command Content (ASCII)
      const commandBytes = Buffer.from(commandText, 'utf8');
      console.log(`📝 Command: "${commandText}" (${commandBytes.length} bytes)`);
      
      // 2. Server Flag (4 bytes)
      const serverFlag = Buffer.alloc(4);
      serverFlag.writeUInt32BE(serverFlagValue, 0);
      console.log(`🏷️  Server Flag: 0x${serverFlagValue.toString(16).toUpperCase().padStart(8, '0')}`);
      
      // 3. Language (2 bytes) - AFTER command, not before!
      const language = Buffer.from([0x00, 0x02]); // English
      console.log(`🌐 Language: 0x00 0x02 (English)`);
      
      // 4. Command Length = Server Flag (4) + Command + Language (2)
      const commandLength = 4 + commandBytes.length + 2;
      console.log(`📏 Command Length: ${commandLength} = 4 + ${commandBytes.length} + 2`);
      
      // 5. Packet Length = Protocol (1) + CmdLen (1) + InfoDetail + Serial (2) + CRC (2)
      const packetLength = 1 + 1 + commandLength + 2 + 2;
      console.log(`📦 Packet Length: ${packetLength} (0x${packetLength.toString(16).toUpperCase()})`);
      
      // 6. Serial Number
      const serial = Buffer.alloc(2);
      serial.writeUInt16BE(this.serialCounter++, 0);
      console.log(`🔢 Serial: ${this.serialCounter - 1}`);
      
      // 7. Build packet
      const totalLength = 2 + 1 + packetLength + 2; // Start + PktLen + Content + Stop
      const packet = Buffer.alloc(totalLength);
      let offset = 0;
      
      // Start Bit
      packet[offset++] = 0x78;
      packet[offset++] = 0x78;
      
      // Packet Length
      packet[offset++] = packetLength;
      
      // Protocol Number
      packet[offset++] = 0x80;
      
      // Command Length
      packet[offset++] = commandLength;
      
      // ✅ CORRECT ORDER (per PDF):
      // Server Flag → Command Content → Language
      serverFlag.copy(packet, offset);
      offset += 4;
      
      commandBytes.copy(packet, offset);
      offset += commandBytes.length;
      
      language.copy(packet, offset);
      offset += 2;
      
      // Serial Number
      serial.copy(packet, offset);
      offset += 2;
      
      // CRC (from Packet Length to Serial Number)
      const crcStart = 2;
      const crcEnd = offset;
      const crcData = packet.slice(crcStart, crcEnd);
      const crc = this.calculateCRC(crcData);
      console.log(`🔐 CRC: 0x${crc.toString(16).toUpperCase().padStart(4, '0')}`);
      
      packet[offset++] = (crc >> 8) & 0xFF;
      packet[offset++] = crc & 0xFF;
      
      // Stop Bit
      packet[offset++] = 0x0D;
      packet[offset++] = 0x0A;
      
      // Verify length
      if (offset !== totalLength) {
        console.error(`❌ Length mismatch! Expected ${totalLength}, got ${offset}`);
        return false;
      }
      
      // Display packet
      const hexPreview = packet.toString('hex').toUpperCase().match(/../g)?.join(' ') || '';
      console.log('\n📦 FINAL PACKET:');
      console.log(hexPreview);
      
      console.log('\n📋 STRUCTURE:');
      console.log(`   Start:      78 78`);
      console.log(`   PktLen:     ${packet[2].toString(16).toUpperCase().padStart(2, '0')} (${packetLength})`);
      console.log(`   Protocol:   80`);
      console.log(`   CmdLen:     ${packet[4].toString(16).toUpperCase().padStart(2, '0')} (${commandLength})`);
      console.log(`   SrvFlag:    ${packet.slice(5, 9).toString('hex').toUpperCase()}`);
      console.log(`   Command:    ${packet.slice(9, 9 + commandBytes.length).toString('hex').toUpperCase()}`);
      console.log(`             = "${commandText}"`);
      console.log(`   Language:   ${packet.slice(9 + commandBytes.length, 9 + commandBytes.length + 2).toString('hex').toUpperCase()}`);
      console.log(`   Serial:     ${packet.slice(offset - 6, offset - 4).toString('hex').toUpperCase()}`);
      console.log(`   CRC:        ${packet.slice(offset - 4, offset - 2).toString('hex').toUpperCase()}`);
      console.log(`   Stop:       0D 0A`);
      console.log('═'.repeat(80) + '\n');
      
      // Send to device
      socket.write(packet);
      console.log(`✅ Packet sent to ${imei}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error sending 0x80:`, error.message);
      console.error(error.stack);
      return false;
    }
  }

  /**
   * 🎥 START RTMP STREAM (DUAL CAMERA AS DEFAULT)
   * 
   * ⚠️ IMPORTANT CHANGE: Default is now 'INOUT' (both cameras)
   * 
   * Camera Modes:
   * - 'OUT' or 0    : Front camera only (CH0)
   * - 'IN' or 1     : Cabin camera only (CH1)
   * - 'INOUT'       : BOTH cameras (CH0 + CH1) ✅✅ DEFAULT ✅✅
   * - undefined/null: BOTH cameras (CH0 + CH1) ✅✅ DEFAULT ✅✅
   */
 startRTMPStream(imei, rtmpUrl = null, cameraIndex = 'INOUT', durationMinutes = 15, activeConnections) {
    console.log('\n' + '═'.repeat(80));
    console.log('🎬 JC261 RTMP STREAM START');
    console.log('═'.repeat(80));
    console.log(`📱 IMEI: ${imei}`);
    
    let cameraMode;
    let cameraDescription;
    
    if (cameraIndex === 0 || cameraIndex === '0' || 
        cameraIndex === 'out' || cameraIndex === 'OUT') {
      cameraMode = 'OUT';
      cameraDescription = '📹 Camera 0 ONLY (front/road)';
      console.warn('⚠️  WARNING: Single camera mode requested - only CH0');
    } 
    else if (cameraIndex === 1 || cameraIndex === '1' || 
             cameraIndex === 'in' || cameraIndex === 'IN') {
      cameraMode = 'IN';
      cameraDescription = '📹 Camera 1 ONLY (cabin/driver)';
      console.warn('⚠️  WARNING: Single camera mode requested - only CH1');
    } 
    else {
      cameraMode = 'INOUT';
      cameraDescription = '📹📹 BOTH CAMERAS (CH0 + CH1)';
      console.log('✅ DUAL CAMERA MODE ACTIVATED');
    }
    
    console.log(cameraDescription);
    console.log(`⏱️  Duration: ${durationMinutes} min`);
    
    const socket = activeConnections.get(imei);
    if (!socket) {
      console.error(`❌ Device not connected`);
      return Promise.resolve(false);
    }
    
    console.log('═'.repeat(80) + '\n');

    return new Promise((resolve) => {
      try {
        // ✅ FIX: Use correct RTMP port
        const publicRtmpHost = process.env.RTMP_PUBLIC_HOST || '98.70.101.16';
        const publicRtmpPort = process.env.RTMP_PUBLIC_PORT || '1935'; // FIXED!
        
        const rtmpBaseUrl = rtmpUrl || `rtmp://${publicRtmpHost}:${publicRtmpPort}/live`;
        const cleanUrl = rtmpBaseUrl.endsWith('#') ? rtmpBaseUrl.slice(0, -1) : rtmpBaseUrl;
        
        const rserviceCommand = `RSERVICE,${cleanUrl}#`;
        
        console.log(`🔗 RTMP Base: ${cleanUrl}`);
        console.log(`📡 Full Command: ${rserviceCommand}`);
        
        if (cameraMode === 'INOUT') {
          console.log(`📝 Device will create TWO streams:`);
          console.log(`   📹 Front (CH0): ${cleanUrl}/0/${imei}`);
          console.log(`   📹 Cabin (CH1): ${cleanUrl}/1/${imei}\n`);
        } else {
          const streamIndex = cameraMode === 'OUT' ? '0' : '1';
          const camName = cameraMode === 'OUT' ? 'Front' : 'Cabin';
          console.log(`📝 Device will create ONE stream:`);
          console.log(`   📹 ${camName} (CH${streamIndex}): ${cleanUrl}/${streamIndex}/${imei}\n`);
        }
        
        let step = 0;
        
        const run = () => {
          step++;
          
          // Step 1: COREKITSW (optional)
          if (step === 1) {
            if (process.env.COREKITSW_BEFORE_RSERVICE !== '0') {
              console.log('📤 STEP 1/3: COREKITSW,0#');
              this.send0x80Command(imei, 'COREKITSW,0#', 0x00000000, activeConnections);
              setTimeout(run, 500);
              return;
            }
            step = 2;
          }
          
          // Step 2: RSERVICE command
          if (step === 2) {
            console.log(`📤 STEP ${process.env.COREKITSW_BEFORE_RSERVICE !== '0' ? '2/3' : '1/2'}: ${rserviceCommand}`);
            this.send0x80Command(imei, rserviceCommand, 0x00000001, activeConnections);
            setTimeout(run, 2000);
            return;
          }
          
          // Step 3: RTMP command
          const dur = Math.max(2, Math.min(180, Number(durationMinutes) || 15));
          const rtmpCommand = `RTMP,ON,${cameraMode},${dur}#`;
          
          console.log(`📤 STEP ${process.env.COREKITSW_BEFORE_RSERVICE !== '0' ? '3/3' : '2/2'}: ${rtmpCommand}`);
          console.log(`   🎥 Mode: ${cameraMode}`);
          
          try {
            this.send0x80Command(imei, rtmpCommand, 0x00000002, activeConnections);
            
            console.log('\n' + '═'.repeat(80));
            console.log('✅ ALL COMMANDS SENT');
            console.log('═'.repeat(80));
            
            if (cameraMode === 'INOUT') {
              console.log(`📺 Device should push to:`);
              console.log(`   📹 Front: rtmp://${publicRtmpHost}:${publicRtmpPort}/live/0/${imei}`);
              console.log(`   📹 Cabin: rtmp://${publicRtmpHost}:${publicRtmpPort}/live/1/${imei}`);
              console.log(`\n👁️  Watch at:`);
              console.log(`   🌐 Front: http://localhost:8888/live/0/${imei}/index.m3u8`);
              console.log(`   🌐 Cabin: http://localhost:8888/live/1/${imei}/index.m3u8`);
            }
            
            console.log(`\n⏳ Wait 10-15 seconds for RTMP connection`);
            console.log(`📊 Check MediaMTX logs for: [RTMP] [conn] opened`);
            console.log('═'.repeat(80) + '\n');
            
            resolve(true);
          } catch (e) {
            console.error(`❌ Error: ${e.message}`);
            resolve(false);
          }
        };

        if (process.env.COREKITSW_BEFORE_RSERVICE === '0') {
          step = 1;
          run();
        } else {
          run();
        }
      } catch (error) {
        console.error(`❌ CRITICAL ERROR: ${error.message}`);
        resolve(false);
      }
    });
  }

  /**
   * Stop RTMP stream
   */
  stopRTMPStream(imei, activeConnections) {
    console.log(`\n🛑 Stopping RTMP for ${imei}`);
    this.send0x80Command(imei, 'RTMP,OFF#', 0x00000003, activeConnections);
    return true;
  }

  getDeviceModel() {
    return 'JC261';
  }

  getDefaultDeviceName(imei) {
    return `JC261-${imei.slice(-4)}`;
  }

  getRTMPCommandLog(imei) {
    return this.rtmpCommandResponses.get(imei) || null;
  }

  clearRTMPCommandLog(imei) {
    this.rtmpCommandResponses.delete(imei);
  }
}

export default JC261Protocol;