/**
 * JC261 Device Protocol Handler
 * Handles JC261-specific protocol decoding and commands
 */

class JC261Protocol {
  constructor(crcCalculator, encodeIMEI) {
    this.calculateCRC = crcCalculator;
    this.encodeIMEI = encodeIMEI;
  }

  /**
   * Create response packet for JC261 devices
   * Format: Start(2) + Length(1) + Protocol(1) + Serial(2) + CRC(2) + Stop(2)
   */
  createResponsePacket(protocolNumber, serialNumber) {
    const packet = Buffer.alloc(10);
    
    // Start bit (2 bytes)
    packet[0] = 0x78;
    packet[1] = 0x78;
    
    // Length (1 byte) - always 5 for simple ACK
    packet[2] = 0x05;
    
    // Protocol number (1 byte)
    packet[3] = protocolNumber;
    
    // Serial number (2 bytes)
    packet[4] = (serialNumber >> 8) & 0xFF;
    packet[5] = serialNumber & 0xFF;
    
    // Calculate CRC on: Length + Protocol + Serial (bytes at index 2, 3, 4, 5)
    const crcData = packet.slice(2, 6);
    const crc = this.calculateCRC(crcData);
    
    // Add CRC (2 bytes, big endian)
    packet[6] = (crc >> 8) & 0xFF;
    packet[7] = crc & 0xFF;
    
    // Stop bit (2 bytes)
    packet[8] = 0x0D;
    packet[9] = 0x0A;
    
    return packet;
  }

  /**
   * Decode login packet (0x01) - JC261 format
   */
  decodeLogin(data) {
    try {
      if (data[0] !== 0x78 || data[1] !== 0x78) {
        return null;
      }

      const length = data[2];
      const protocol = data[3];

      if (protocol !== 0x01) {
        return null;
      }

      // IMEI is 8 bytes starting from position 4
      const imeiBytes = data.slice(4, 12);
      const imei = this.decodeIMEI(imeiBytes);

      // Type of machine (2 bytes)
      const machineType = data.readUInt16BE(12);

      // Timezone and language (2 bytes)
      const timezoneLang = data.readUInt16BE(14);

      // Serial number (2 bytes)
      const serialNumber = data.readUInt16BE(16);

      // CRC (2 bytes)
      const crcReceived = data.readUInt16BE(18);

      // Verify CRC
      const crcData = data.slice(2, 18); // Length to Serial
      const crcCalculated = this.calculateCRC(crcData);

      return {
        type: 'login',
        imei: imei,
        machineType: machineType.toString(16).toUpperCase().padStart(4, '0'),
        timezoneLang: timezoneLang.toString(16).toUpperCase().padStart(4, '0'),
        serial: serialNumber,
        crcReceived: crcReceived,
        crcCalculated: crcCalculated,
        crcValid: crcReceived === crcCalculated
      };
    } catch (e) {
      console.error('❌ JC261 Login decode error:', e.message);
      return null;
    }
  }

  /**
   * Decode heartbeat packet (0x13) - JC261 format
   */
  decodeHeartbeat(data) {
    try {
      if (data[0] !== 0x78 || data[1] !== 0x78) {
        return null;
      }

      const protocol = data[3];
      if (protocol !== 0x13) {
        return null;
      }

      const serialNumber = data.readUInt16BE(data.length - 6);
      const termInfo = data.length > 9 ? data[4] : 0;

      let voltage = null;
      if (data.length > 11) {
        voltage = data.readUInt16BE(5) / 100.0;
      }

      const gsmSignal = data.length > 12 ? data[7] : 0;

      return {
        type: 'heartbeat',
        serial: serialNumber,
        termInfo: termInfo,
        voltage: voltage,
        gsmSignal: gsmSignal
      };
    } catch (e) {
      console.error('❌ JC261 Heartbeat decode error:', e.message);
      return null;
    }
  }

  /**
   * Decode location packet (0x22, 0x12, or 0x20) - JC261 format
   */
  decodeLocation(data) {
    try {
      // Check for both 78 78 and 79 79 start bytes
      if (!((data[0] === 0x78 && data[1] === 0x78) || (data[0] === 0x79 && data[1] === 0x79))) {
        return null;
      }

      const protocol = data[3];
      if (![0x22, 0x12, 0x20].includes(protocol)) {
        return null;
      }

      // Get serial number (2 bytes before CRC)
      const serialNumber = data.readUInt16BE(data.length - 6);

      // Protocol 0x20 has different structure
      if (protocol === 0x20) {
        try {
          let offset = 4;

          // Check if we have enough data
          if (data.length < 20) {
            console.log(`⚠️ JC261 Protocol 0x20 packet too short: ${data.length} bytes`);
            return null;
          }

          // Sub-length or info (2 bytes)
          const subInfo = data.readUInt16BE(offset);
          offset += 2;

          // IMEI (8 bytes)
          if (offset + 8 > data.length - 6) {
            console.log(`⚠️ JC261 Protocol 0x20: Not enough data for IMEI`);
            return null;
          }
          const imeiBytes = data.slice(offset, offset + 8);
          const imei = this.decodeIMEI(imeiBytes);
          offset += 8;

          // Date/Time (6 bytes: YY MM DD HH MM SS)
          if (offset + 6 > data.length - 6) {
            console.log(`⚠️ JC261 Protocol 0x20: Not enough data for date/time`);
            return null;
          }
          const year = 2000 + (data[offset] || 0);
          const month = data[offset + 1] || 1;
          const day = data[offset + 2] || 1;
          const hour = data[offset + 3] || 0;
          const minute = data[offset + 4] || 0;
          const second = data[offset + 5] || 0;
          offset += 6;

          // Satellites (1 byte)
          const satellites = offset < data.length - 6 ? ((data[offset] || 0) >> 4) : 0;
          const gpsValid = offset < data.length - 6 ? ((data[offset] || 0) & 0x0F) : 0;
          offset += 1;

          // Latitude (4 bytes)
          let lat = 0;
          if (offset + 4 <= data.length - 6) {
            const latRaw = data.readUInt32BE(offset);
            lat = latRaw / 1800000.0;
            offset += 4;
          }

          // Longitude (4 bytes)
          let lon = 0;
          if (offset + 4 <= data.length - 6) {
            const lonRaw = data.readUInt32BE(offset);
            lon = lonRaw / 1800000.0;
            offset += 4;
          }

          // Speed (1 byte)
          const speed = offset < data.length - 6 ? (data[offset] || 0) : 0;
          offset += 1;

          // Course/Status (2 bytes)
          const courseStatus = (offset + 2 <= data.length - 6) ? data.readUInt16BE(offset) : 0;

          return {
            type: 'location',
            protocol: protocol,
            serial: serialNumber,
            imei: imei,
            time: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
            lat: lat,
            lon: lon,
            speed: speed,
            course: courseStatus & 0x03FF,
            satellites: satellites,
            gpsValid: gpsValid > 0,
            mcc: 0,
            mnc: 0,
            lac: 0,
            cellId: 0
          };
        } catch (error) {
          console.error(`❌ JC261 Protocol 0x20 decode error:`, error.message);
          return null;
        }
      }

      // Standard location parsing for 0x22 and 0x12
      // Parse location data (starts at byte 4)
      const year = 2000 + data[4];
      const month = data[5];
      const day = data[6];
      const hour = data[7];
      const minute = data[8];
      const second = data[9];

      // GPS info byte
      const gpsInfo = data[10];
      const gpsValid = (gpsInfo >> 4) & 0x01;

      // Latitude (4 bytes, big endian)
      const latRaw = data.readUInt32BE(11);
      const lat = latRaw / 1800000.0;

      // Longitude (4 bytes, big endian)
      const lonRaw = data.readUInt32BE(15);
      const lon = lonRaw / 1800000.0;

      // Speed
      const speed = data[19];

      // Course/Status (2 bytes)
      const courseStatus = data.readUInt16BE(20);

      // MCC, MNC, LAC, Cell ID (if available)
      const mcc = data.length > 24 ? data.readUInt16BE(22) : 0;
      const mnc = data.length > 25 ? data[24] : 0;
      const lac = data.length > 27 ? data.readUInt16BE(25) : 0;
      const cellId = data.length > 30 ? data.readUIntBE(27, 3) : 0;

      // Satellites count
      const satellites = (gpsInfo >> 4) & 0x0F;

      return {
        type: 'location',
        protocol: protocol,
        serial: serialNumber,
        time: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`,
        lat: lat,
        lon: lon,
        speed: speed,
        course: courseStatus & 0x03FF,
        gpsValid: gpsValid === 1,
        satellites: satellites,
        mcc: mcc,
        mnc: mnc,
        lac: lac,
        cellId: cellId
      };
    } catch (e) {
      console.error('❌ JC261 Location decode error:', e.message);
      console.error(e.stack);
      return null;
    }
  }

  /**
   * Decode IMEI from BCD format
   */
  decodeIMEI(imeiBytes) {
    let imei = '';
    for (let i = 0; i < imeiBytes.length; i++) {
      const byte = imeiBytes[i];
      const high = (byte >> 4) & 0x0F;
      const low = byte & 0x0F;
      imei += high.toString() + low.toString();
    }
    
    // Remove leading zeros if any
    imei = imei.replace(/^0+/, '');
    
    // IMEI should be 15 digits
    if (imei.length > 15) {
      imei = imei.slice(-15);
    }
    
    return imei;
  }

  /**
   * Handle incoming packet for JC261 devices
   */
  async handlePacket(data, socket, deviceIMEI) {
    const hexData = data.toString('hex').toUpperCase();
    const hexFormatted = hexData.match(/../g).join(' ');
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    console.log(`\n[${timestamp}] 📦 Raw (JC261): ${hexFormatted}`);

    if (data.length < 5) {
      console.log('⚠️  Packet too short, ignoring');
      return null;
    }

    const protocol = data[3];
    console.log(`📋 Protocol: 0x${protocol.toString(16).toUpperCase().padStart(2, '0')}`);

    if (protocol === 0x01) { // Login
      const result = this.decodeLogin(data);
      if (result) {
        const serialHex = result.serial.toString(16).toUpperCase().padStart(4, '0');
        console.log('🔐 JC261 LOGIN PACKET');
        console.log(`   IMEI: ${result.imei}`);
        console.log(`   Machine Type: ${result.machineType}`);
        console.log(`   Timezone/Lang: ${result.timezoneLang}`);
        console.log(`   Serial: ${serialHex} (${result.serial})`);
        console.log(`   Device CRC: ${result.crcReceived.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`   Our CRC: ${result.crcCalculated.toString(16).toUpperCase().padStart(4, '0')}`);
        console.log(`   CRC Valid: ${result.crcValid ? '✅ YES' : '❌ NO'}`);

        const ack = this.createResponsePacket(0x01, result.serial);
        socket.write(ack);

        const ackHex = ack.toString('hex').toUpperCase();
        const ackFormatted = ackHex.match(/../g).join(' ');
        const crcCheck = this.calculateCRC(ack.slice(2, 6));
        console.log(`✅ Sent JC261 LOGIN ACK: ${ackFormatted}`);
        console.log(`   CRC: ${crcCheck.toString(16).toUpperCase().padStart(4, '0')}`);

        return result;
      }
    } else if (protocol === 0x13) { // Heartbeat
      const result = this.decodeHeartbeat(data);
      if (result) {
        const serialHex = result.serial.toString(16).toUpperCase().padStart(4, '0');
        console.log('💓 JC261 HEARTBEAT');
        console.log(`   Serial: ${serialHex}`);
        if (result.voltage) {
          console.log(`   🔋 Voltage: ${result.voltage.toFixed(2)}V`);
        }
        if (result.gsmSignal) {
          console.log(`   📶 GSM Signal: ${result.gsmSignal}`);
        }

        const ack = this.createResponsePacket(0x13, result.serial);
        socket.write(ack);

        const ackHex = ack.toString('hex').toUpperCase();
        const ackFormatted = ackHex.match(/../g).join(' ');
        console.log(`✅ Sent JC261 HEARTBEAT ACK: ${ackFormatted}`);

        return { ...result, imei: deviceIMEI };
      }
    } else if ([0x22, 0x12, 0x20].includes(protocol)) { // Location
      const result = this.decodeLocation(data);
      if (result) {
        const serialHex = result.serial.toString(16).toUpperCase().padStart(4, '0');
        console.log('\n' + '='.repeat(70));
        console.log(`🌍 JC261 LOCATION DATA (Protocol: 0x${result.protocol.toString(16).toUpperCase().padStart(2, '0')})`);
        console.log('='.repeat(70));
        console.log(`⏰ Time: ${result.time}`);
        console.log(`📍 GPS: ${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`);
        console.log(`🚗 Speed: ${result.speed} km/h`);
        console.log(`🧭 Course: ${result.course}°`);
        console.log(`🛰️  Satellites: ${result.satellites}`);
        console.log(`📡 GPS Valid: ${result.gpsValid ? '✅ Yes' : '❌ No'}`);
        if (result.mcc) {
          console.log(`📱 Cell: MCC=${result.mcc}, MNC=${result.mnc}, LAC=${result.lac}, CID=${result.cellId}`);
        }
        console.log(`🗺️  Map: https://maps.google.com/?q=${result.lat},${result.lon}`);
        console.log(`   Serial: ${serialHex}`);
        console.log('='.repeat(70));

        const ack = this.createResponsePacket(result.protocol, result.serial);
        socket.write(ack);

        const ackHex = ack.toString('hex').toUpperCase();
        const ackFormatted = ackHex.match(/../g).join(' ');
        console.log(`✅ Sent JC261 LOCATION ACK: ${ackFormatted}`);

        return { ...result, imei: deviceIMEI || result.imei };
      }
    } else if (protocol === 0x16) { // Alarm
      const serialNumber = data.readUInt16BE(data.length - 6);
      const serialHex = serialNumber.toString(16).toUpperCase().padStart(4, '0');
      const alarmType = data.length > 9 ? data[4] : 0;
      console.log(`🚨 JC261 ALARM - Type: 0x${alarmType.toString(16).toUpperCase().padStart(2, '0')}`);
      console.log(`   Serial: ${serialHex}`);

      const ack = this.createResponsePacket(0x16, serialNumber);
      socket.write(ack);

      const ackHex = ack.toString('hex').toUpperCase();
      const ackFormatted = ackHex.match(/../g).join(' ');
      console.log(`✅ Sent JC261 ALARM ACK: ${ackFormatted}`);

      return { type: 'alarm', serial: serialNumber, alarmType, imei: deviceIMEI };
    } else if (protocol === 0xE0) { // LBS status/configuration
      const serialNumber = data.readUInt16BE(data.length - 6);
      const serialHex = serialNumber.toString(16).toUpperCase().padStart(4, '0');
      console.log('📡 JC261 LBS/CONFIG STATUS (0xE0)');
      console.log(`   Serial: ${serialHex}`);
      console.log(`   Data: ${data.slice(4, -4).toString('hex').toUpperCase().match(/../g).join(' ')}`);

      const ack = this.createResponsePacket(0xE0, serialNumber);
      socket.write(ack);

      const ackHex = ack.toString('hex').toUpperCase();
      const ackFormatted = ackHex.match(/../g).join(' ');
      console.log(`✅ Sent JC261 CONFIG ACK: ${ackFormatted}`);

      return { type: 'config', serial: serialNumber, imei: deviceIMEI };
    } else if (protocol === 0xE1) { // Status inquiry response
      const serialNumber = data.readUInt16BE(data.length - 6);
      const serialHex = serialNumber.toString(16).toUpperCase().padStart(4, '0');
      console.log('📊 JC261 STATUS INQUIRY (0xE1)');
      console.log(`   Serial: ${serialHex}`);

      const ack = this.createResponsePacket(0xE1, serialNumber);
      socket.write(ack);

      const ackHex = ack.toString('hex').toUpperCase();
      const ackFormatted = ackHex.match(/../g).join(' ');
      console.log(`✅ Sent JC261 STATUS ACK: ${ackFormatted}`);

      return { type: 'status', serial: serialNumber, imei: deviceIMEI };
    } else if (protocol === 0x8A) { // Time check
      const serialNumber = data.readUInt16BE(data.length - 6);
      const serialHex = serialNumber.toString(16).toUpperCase().padStart(4, '0');
      console.log('🕐 JC261 TIME CHECK');
      console.log(`   Serial: ${serialHex}`);

      const ack = this.createResponsePacket(0x8A, serialNumber);
      socket.write(ack);

      const ackHex = ack.toString('hex').toUpperCase();
      const ackFormatted = ackHex.match(/../g).join(' ');
      console.log(`✅ Sent JC261 ACK: ${ackFormatted}`);

      return { type: 'time_check', serial: serialNumber, imei: deviceIMEI };
    } else { // Unknown protocol
      const serialNumber = data.length >= 6 ? data.readUInt16BE(data.length - 6) : 0x0000;
      const serialHex = serialNumber.toString(16).toUpperCase().padStart(4, '0');
      console.log(`❓ JC261 Unknown protocol: 0x${protocol.toString(16).toUpperCase().padStart(2, '0')}`);
      console.log(`   Serial: ${serialHex}`);

      try {
        const ack = this.createResponsePacket(protocol, serialNumber);
        socket.write(ack);

        const ackHex = ack.toString('hex').toUpperCase();
        const ackFormatted = ackHex.match(/../g).join(' ');
        console.log(`✅ Sent JC261 GENERIC ACK: ${ackFormatted}`);
      } catch (e) {
        console.log(`⚠️  Could not send ACK: ${e.message}`);
      }

      return { type: 'unknown', protocol, serial: serialNumber, imei: deviceIMEI };
    }

    return null;
  }

  /**
   * Send text command to JC261 device via TCP
   */
  sendTextCommand(imei, command, activeConnections) {
    const socket = activeConnections.get(imei);
    if (!socket) {
      console.error(`❌ JC261 Device ${imei} not connected`);
      return false;
    }

    try {
      // Method 1: Try sending as plain text first
      const textBuffer = Buffer.from(command + '\r\n', 'utf8');
      socket.write(textBuffer);
      console.log(`📤 JC261 Text command sent to ${imei}: ${command}`);
      
      // Method 2: Also try wrapping in binary packet format
      // Some JC261 devices accept text commands in binary format
      setTimeout(() => {
        try {
          const commandBytes = Buffer.from(command, 'utf8');
          const packetLength = 2 + 1 + 2 + 8 + commandBytes.length + 2 + 2;
          const packet = Buffer.alloc(packetLength);
          
          // Start bytes
          packet[0] = 0x78;
          packet[1] = 0x78;
          
          // Length: protocol(2) + IMEI(8) + command length
          const dataLength = 2 + 8 + commandBytes.length;
          packet[2] = dataLength;
          
          // Protocol: 0x8001 (text command)
          packet[3] = 0x80;
          packet[4] = 0x01;
          
          // IMEI in BCD format
          const imeiBytes = this.encodeIMEI(imei);
          imeiBytes.copy(packet, 5);
          
          // Command text
          commandBytes.copy(packet, 13);
          
          // Calculate CRC
          const crcData = packet.slice(2, 13 + commandBytes.length);
          const crc = this.calculateCRC(crcData);
          packet[13 + commandBytes.length] = (crc >> 8) & 0xFF;
          packet[13 + commandBytes.length + 1] = crc & 0xFF;
          
          // Stop bytes
          packet[packetLength - 2] = 0x0D;
          packet[packetLength - 1] = 0x0A;
          
          socket.write(packet);
          console.log(`📤 JC261 Binary-wrapped command sent to ${imei}: ${command}`);
        } catch (err) {
          console.log(`⚠️ JC261 Binary wrap failed, using text only: ${err.message}`);
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error(`❌ JC261 Error sending text command to ${imei}:`, error.message);
      return false;
    }
  }

  /**
   * Request location from JC261 device (0x8201 command)
   */
  requestLocation(imei, activeConnections) {
    const socket = activeConnections.get(imei);
    if (!socket) {
      console.error(`❌ JC261 Device ${imei} not connected`);
      return false;
    }

    try {
      // Encode IMEI to BCD format
      const imeiBytes = this.encodeIMEI(imei);
      
      // Build location query command (0x8201)
      const packet = Buffer.alloc(19);
      
      // Start bytes
      packet[0] = 0x78;
      packet[1] = 0x78;
      
      // Length: Protocol(2) + IMEI(8) + Serial(2) = 12 bytes
      packet[2] = 0x0C;
      
      // Protocol: 0x8201 (location query) - 2 bytes
      packet[3] = 0x82;
      packet[4] = 0x01;
      
      // IMEI (8 bytes, BCD format)
      imeiBytes.copy(packet, 5);
      
      // Serial number (2 bytes, use 0x0001)
      packet[13] = 0x00;
      packet[14] = 0x01;
      
      // Calculate CRC on: Length + Protocol + IMEI + Serial (bytes 2-15)
      const crcData = packet.slice(2, 15);
      const crc = this.calculateCRC(crcData);
      
      // Add CRC (2 bytes, big endian)
      packet[15] = (crc >> 8) & 0xFF;
      packet[16] = crc & 0xFF;
      
      // Stop bytes
      packet[17] = 0x0D;
      packet[18] = 0x0A;
      
      socket.write(packet);
      
      const hexFormatted = packet.toString('hex').toUpperCase().match(/../g).join(' ');
      console.log(`📡 JC261 Location query sent to ${imei}: ${hexFormatted}`);
      
      return true;
    } catch (error) {
      console.error(`❌ JC261 Error sending location request to ${imei}:`, error.message);
      return false;
    }
  }

  /**
   * Send 0x80 packet command to JC261 device
   * According to JC261 protocol: 0x80 is server sending data packet to terminal
   */
  send0x80Command(imei, commandText, serverFlag = 0x0001, activeConnections) {
    const socket = activeConnections.get(imei);
    if (!socket) {
      console.error(`❌ JC261 Device ${imei} not connected`);
      return false;
    }

    try {
      const commandBytes = Buffer.from(commandText, 'utf8');
      const imeiBytes = this.encodeIMEI(imei);
      
      // Packet structure: Start(2) + Length(1) + Protocol(1) + IMEI(8) + ServerFlag(2) + Command + CRC(2) + Stop(2)
      const dataLength = 1 + 8 + 2 + commandBytes.length; // Protocol + IMEI + ServerFlag + Command
      const packetLength = 2 + 1 + dataLength + 2 + 2; // Start + Length + Data + CRC + Stop
      
      const packet = Buffer.alloc(packetLength);
      let offset = 0;
      
      // Start bytes: 0x78 0x78
      packet[offset++] = 0x78;
      packet[offset++] = 0x78;
      
      // Length
      packet[offset++] = dataLength;
      
      // Protocol: 0x80 (Server sends data packet to terminal)
      packet[offset++] = 0x80;
      
      // IMEI (8 bytes BCD format)
      imeiBytes.copy(packet, offset);
      offset += 8;
      
      // ServerFlag (2 bytes, little endian)
      packet[offset++] = serverFlag & 0xFF;
      packet[offset++] = (serverFlag >> 8) & 0xFF;
      
      // Command text
      commandBytes.copy(packet, offset);
      offset += commandBytes.length;
      
      // Calculate CRC for data portion (from Length to end of command)
      const crcData = packet.slice(2, offset);
      const crc = this.calculateCRC(crcData);
      packet[offset++] = (crc >> 8) & 0xFF;
      packet[offset++] = crc & 0xFF;
      
      // Stop bytes: 0x0D 0x0A
      packet[offset++] = 0x0D;
      packet[offset++] = 0x0A;
      
      socket.write(packet);
      const hexPreview = packet.toString('hex').toUpperCase().match(/../g)?.slice(0, 10).join(' ') || '';
      console.log(`📤 JC261 0x80 packet sent to ${imei}: ${commandText}`);
      console.log(`   ServerFlag: 0x${serverFlag.toString(16).toUpperCase().padStart(4, '0')}, Packet HEX: ${hexPreview}...`);
      
      return true;
    } catch (error) {
      console.error(`❌ JC261 Error sending 0x80 command to ${imei}:`, error.message);
      console.error(error.stack);
      return false;
    }
  }

  /**
   * Start RTMP streaming for JC261 device using 0x80 packet (no SMS).
   * Per JC261 Command List & Jimi protocol 5.8:
   * - COREKITSW,0# first (integrated mode) — required before RSERVICE/RTMP on some firmware.
   * - RSERVICE,<url># sets RTMP push URL; format rtmp://host:port/live/{channel}/{imei} (protocol 5.8).
   * - RTMP,ON,<IN|OUT|INOUT>,<2–180># starts live stream.
   * @param {number} durationMinutes - 2–180; default 15.
   * @returns {Promise<boolean>}
   */
  startRTMPStream(imei, rtmpUrl = null, cameraIndex = 0, durationMinutes = 15, activeConnections) {
    console.log(`🔍 JC261 startRTMPStream called for IMEI: ${imei}`);
    console.log(`📋 Active connections IMEIs: ${Array.from(activeConnections.keys()).join(', ')}`);
    
    const socket = activeConnections.get(imei);
    if (!socket) {
      console.error(`❌ JC261 Device ${imei} not connected - socket not found`);
      console.log(`📋 Available IMEIs: ${Array.from(activeConnections.keys()).join(', ')}`);
      return Promise.resolve(false);
    }
    
    console.log(`✅ Socket found for ${imei}, socket writable: ${socket.writable}`);

    return new Promise((resolve) => {
      try {
        console.log(`🎥 JC261: Starting RTMP stream for device ${imei}, camera ${cameraIndex}, duration ${durationMinutes} min...`);
        
        const publicRtmpHost = process.env.RTMP_PUBLIC_HOST || 'bore.pub';
        const publicRtmpPort = process.env.RTMP_PUBLIC_PORT || '22797';
        const noRtmpPrefix = process.env.RSERVICE_NO_RTMP_PREFIX === '1';
        // URL must NOT contain # — # is only the command terminator. Protocol 5.8: rtmp://host:port/live/{channel}/{imei}
        let rtmpBaseUrl = rtmpUrl || (noRtmpPrefix
          ? `${publicRtmpHost}:${publicRtmpPort}/live/${cameraIndex}/${imei}`
          : `rtmp://${publicRtmpHost}:${publicRtmpPort}/live/${cameraIndex}/${imei}`);
        if (typeof rtmpBaseUrl === 'string' && rtmpBaseUrl.endsWith('#')) rtmpBaseUrl = rtmpBaseUrl.slice(0, -1);
        const rserviceCommand = `RSERVICE,${rtmpBaseUrl}#`;
        
        console.log(`📡 JC261 RTMP URL (for device): ${rtmpBaseUrl}`);
        
        const sendPlain = () => {
          if (process.env.RTMP_ALSO_PLAIN_TEXT !== '1') return;
          const s = activeConnections.get(imei);
          if (s && s.writable) return s;
          return null;
        };

        let step = 0;
        const run = () => {
          step++;
          if (step === 1) {
            // 1) COREKITSW,0# — integrated mode (JC261 Command List / openfms). Skip if env COREKITSW_BEFORE_RSERVICE=0.
            if (process.env.COREKITSW_BEFORE_RSERVICE !== '0') {
              const coreCmd = 'COREKITSW,0#';
              this.send0x80Command(imei, coreCmd, 0x0000, activeConnections);
              const ps = sendPlain();
              if (ps) { ps.write(Buffer.from(coreCmd + '\r\n', 'utf8')); console.log('📤 (RTMP_ALSO_PLAIN_TEXT) Plain COREKITSW,0 sent'); }
              console.log('📤 COREKITSW,0# sent (0x80) — integrated mode');
              setTimeout(run, 500);
              return;
            }
            step = 2;
          }
          if (step === 2) {
            // 2) RSERVICE,<url>#
            this.send0x80Command(imei, rserviceCommand, 0x0001, activeConnections);
            const ps = sendPlain();
            if (ps) { ps.write(Buffer.from(rserviceCommand + '\r\n', 'utf8')); console.log('📤 (RTMP_ALSO_PLAIN_TEXT) Plain RSERVICE sent'); }
            console.log('');
            console.log('======================================================================');
            console.log('📤 RSERVICE COMMAND SENT (0x80 TCP, NO SMS)');
            console.log('   IMEI:', imei, '| Command:', rserviceCommand);
            console.log('======================================================================');
            console.log('');
            setTimeout(run, 1000);
            return;
          }
          // 3) RTMP,ON,<camera>,<dur>#
          const dur = Math.max(2, Math.min(180, Number(durationMinutes) || 15));
          const cameraMode = cameraIndex === 0 ? 'OUT' : (cameraIndex === 1 ? 'IN' : 'INOUT');
          const rtmpCommand = `RTMP,ON,${cameraMode},${dur}#`;
          try {
            this.send0x80Command(imei, rtmpCommand, 0x0002, activeConnections);
            const ps = sendPlain();
            if (ps) { ps.write(Buffer.from(rtmpCommand + '\r\n', 'utf8')); console.log('📤 (RTMP_ALSO_PLAIN_TEXT) Plain RTMP,ON sent'); }
            console.log('');
            console.log('======================================================================');
            console.log(`📤 RTMP STREAM COMMAND SENT (${dur} MIN) (0x80 TCP, NO SMS)`);
            console.log('   IMEI:', imei, '| Command:', rtmpCommand, '| Camera:', cameraMode);
            console.log('======================================================================');
            console.log('');
            resolve(true);
          } catch (e) {
            console.error(`❌ JC261 Error sending RTMP,ON for ${imei}:`, e && e.message ? e.message : e);
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
        console.error(`❌ JC261 Error starting RTMP stream for ${imei}:`, error.message);
        resolve(false);
      }
    });
  }

  /**
   * Stop RTMP streaming for JC261 device using 0x80 packet
   */
  stopRTMPStream(imei, activeConnections) {
    const socket = activeConnections.get(imei);
    if (!socket) {
      console.error(`❌ JC261 Device ${imei} not connected`);
      return false;
    }

    try {
      const stopCommand = `RTMP,OFF#`;
      this.send0x80Command(imei, stopCommand, 0x0003, activeConnections);
      console.log('');
      console.log('========== RTMP STREAM STOP COMMAND SENT (0x80 TCP, NO SMS) ==========');
      console.log(`   IMEI: ${imei} | Command: ${stopCommand}`);
      console.log('');
      return true;
    } catch (error) {
      console.error(`❌ JC261 Error stopping RTMP stream for ${imei}:`, error.message);
      return false;
    }
  }

  /**
   * Old stop method (kept for compatibility)
   */
  stopRTMPStreamOld(imei, activeConnections) {
    try {
      const rtmpCommand = `RTMP,OFF#`;
      const success = this.sendTextCommand(imei, rtmpCommand, activeConnections);
      if (success) {
        console.log(`🛑 JC261 RTMP stream stopped for device ${imei}`);
      }
      return success;
    } catch (error) {
      console.error(`❌ JC261 Error stopping RTMP stream for ${imei}:`, error.message);
      return false;
    }
  }

  /**
   * Get device model name
   */
  getDeviceModel() {
    return 'JC261';
  }

  /**
   * Get default device name format
   */
  getDefaultDeviceName(imei) {
    return `JC261-${imei.slice(-4)}`;
  }
}

export default JC261Protocol;
