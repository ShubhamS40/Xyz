// /**
//  * PL601 Device Protocol Handler - COMPLETE FIX
//  * 
//  * CRITICAL FIXES:
//  * 1. Added SMS-based communication (primary mode for PL601)
//  * 2. Fixed server configuration detection
//  * 3. Added SOS number requirement handling
//  * 4. Improved connection diagnostics
//  * 5. Added dual-mode support (SMS + TCP)
//  */

// class PL601Protocol {
//   constructor(crcCalculator, encodeIMEI) {
//     this.calculateCRC = crcCalculator;
//     this.encodeIMEI = encodeIMEI;
//     this.deviceBatteryCache = new Map();
//     this.deviceConfigCache = new Map(); // Track device configurations
//     this.pendingCommands = new Map(); // Track command responses
//   }

//   /**
//    * Create response packet for PL601 devices
//    * Format: 78 78 [Length] [Protocol] [Serial] [CRC] 0D 0A
//    */
//   createResponsePacket(protocolNumber, serialNumber) {
//     const packet = Buffer.alloc(10);
    
//     packet[0] = 0x78;
//     packet[1] = 0x78;
//     packet[2] = 0x05;
//     packet[3] = protocolNumber;
//     packet[4] = (serialNumber >> 8) & 0xFF;
//     packet[5] = serialNumber & 0xFF;
    
//     const crcData = packet.slice(2, 6);
//     const crc = this.calculateCRC(crcData);
    
//     packet[6] = (crc >> 8) & 0xFF;
//     packet[7] = crc & 0xFF;
//     packet[8] = 0x0D;
//     packet[9] = 0x0A;
    
//     return packet;
//   }

//   /**
//    * Decode login packet (Protocol 0x01)
//    */
//   decodeLogin(data) {
//     try {
//       if (data[0] !== 0x78 || data[1] !== 0x78) {
//         return null;
//       }

//       const protocol = data[3];
//       if (protocol !== 0x01) {
//         return null;
//       }

//       const imeiBytes = data.slice(4, 12);
//       const imei = this.decodeIMEI(imeiBytes);
//       const machineType = data.readUInt16BE(12);
//       const timezoneLang = data.readUInt16BE(14);
//       const serialNumber = data.readUInt16BE(16);
//       const crcReceived = data.readUInt16BE(18);
//       const crcData = data.slice(2, 18);
//       const crcCalculated = this.calculateCRC(crcData);

//       return {
//         type: 'login',
//         imei: imei,
//         machineType: machineType.toString(16).toUpperCase().padStart(4, '0'),
//         timezoneLang: timezoneLang.toString(16).toUpperCase().padStart(4, '0'),
//         serial: serialNumber,
//         crcReceived: crcReceived,
//         crcCalculated: crcCalculated,
//         crcValid: crcReceived === crcCalculated
//       };
//     } catch (e) {
//       console.error('❌ PL601 Login decode error:', e.message);
//       return null;
//     }
//   }

//   /**
//    * Decode heartbeat packet (Protocol 0x13)
//    * Contains battery voltage and GSM signal
//    */
//   decodeHeartbeat(data) {
//     try {
//       if (data[0] !== 0x78 || data[1] !== 0x78) {
//         return null;
//       }

//       const protocol = data[3];
//       if (protocol !== 0x13) {
//         return null;
//       }

//       const serialNumber = data.readUInt16BE(data.length - 6);
//       const termInfo = data.length > 9 ? data[4] : 0;

//       let voltage = null;
//       let batteryPercentage = null;
//       let batteryStatus = 'UNKNOWN';
      
//       if (data.length > 11) {
//         voltage = data.readUInt16BE(5) / 100.0;
        
//         // Battery percentage calculation (Li-Po: 3.3V-4.2V)
//         if (voltage >= 4.1) {
//           batteryPercentage = 100;
//           batteryStatus = 'FULL';
//         } else if (voltage >= 3.9) {
//           batteryPercentage = Math.round(70 + ((voltage - 3.9) / 0.2) * 30);
//           batteryStatus = 'GOOD';
//         } else if (voltage >= 3.7) {
//           batteryPercentage = Math.round(40 + ((voltage - 3.7) / 0.2) * 30);
//           batteryStatus = 'NORMAL';
//         } else if (voltage >= 3.5) {
//           batteryPercentage = Math.round(10 + ((voltage - 3.5) / 0.2) * 30);
//           batteryStatus = 'LOW';
//         } else {
//           batteryPercentage = Math.round(Math.max(0, (voltage - 3.3) / 0.2 * 10));
//           batteryStatus = 'CRITICAL';
//         }
//       }

//       const gsmSignal = data.length > 12 ? data[7] : 0;
//       let signalLevel = 'Unknown';
      
//       if (gsmSignal >= 25) signalLevel = 'Excellent';
//       else if (gsmSignal >= 20) signalLevel = 'Good';
//       else if (gsmSignal >= 15) signalLevel = 'Fair';
//       else if (gsmSignal >= 10) signalLevel = 'Weak';
//       else signalLevel = 'Very Weak';

//       const result = {
//         type: 'heartbeat',
//         serial: serialNumber,
//         termInfo: termInfo,
//         voltage: voltage,
//         batteryPercentage: batteryPercentage,
//         batteryStatus: batteryStatus,
//         gsmSignal: gsmSignal,
//         signalLevel: signalLevel,
//         timestamp: new Date().toISOString()
//       };

//       return result;
//     } catch (e) {
//       console.error('❌ PL601 Heartbeat decode error:', e.message);
//       return null;
//     }
//   }

//   /**
//    * Decode location packet - UNIVERSAL DECODER
//    * Handles ALL location protocols: 0x10, 0x11, 0x12, 0x16, 0x18, 0x20, 0x22, 0xA2, 0x8A
//    * Protocol 0xA2 is extended location data with additional fields
//    */
//   decodeLocation(data) {
//     try {
//       // Check start bytes (78 78 or 79 79)
//       const isShortHeader = (data[0] === 0x78 && data[1] === 0x78);
//       const isLongHeader = (data[0] === 0x79 && data[1] === 0x79);
      
//       if (!isShortHeader && !isLongHeader) {
//         return null;
//       }

//       const length = isShortHeader ? data[2] : data.readUInt16BE(2);
//       const protocol = isShortHeader ? data[3] : data[4];
      
//       console.log(`🔍 Checking protocol 0x${protocol.toString(16).toUpperCase()} for location data...`);
      
//       // ALL possible location protocols (including 0xA2 for extended location data)
//       const locationProtocols = [0x10, 0x11, 0x12, 0x16, 0x18, 0x1A, 0x20, 0x22, 0xA2, 0x8A];
      
//       if (!locationProtocols.includes(protocol)) {
//         return null;
//       }

//       // Protocol 0xA2 structure - needs special handling
//       // Protocol 0x8A is typically a response/acknowledgement
//       let dataOffset;
//       if (protocol === 0xA2) {
//         // Protocol 0xA2 has extended format with additional header fields
//         // Structure appears to be: 78 78 [len] A2 [info/sequence 2 bytes] [date/time 6 bytes] [gps info] [lat 4] [lon 4]...
//         // Based on packet analysis: after protocol byte, there are 2 info bytes (00 09) before date/time
//         // So date/time starts at offset 6 (4 + 2 info bytes)
//         dataOffset = 6; // Protocol byte at 3, then 2 info bytes, then date/time at 6
//       } else if (protocol === 0x8A) {
//         // 0x8A is typically a simple response, try standard offset
//         dataOffset = isShortHeader ? 4 : 5;
//       } else {
//         // Standard location protocols
//         dataOffset = isShortHeader ? 4 : 5;
//       }

//       // Serial number is always at (length - 6) from start
//       const serialPos = data.length - 6;
//       const serialNumber = data.readUInt16BE(serialPos);

//       // Check if we have enough data for location parsing
//       if (data.length < dataOffset + 17) {
//         console.log(`⚠️  Packet too short for location data (need ${dataOffset + 17}, have ${data.length})`);
//         return null;
//       }

//       // Date and time (6 bytes) - validate values
//       let year = 2000 + (data[dataOffset] || 0);
//       let month = data[dataOffset + 1] || 1;
//       let day = data[dataOffset + 2] || 1;
//       let hour = data[dataOffset + 3] || 0;
//       let minute = data[dataOffset + 4] || 0;
//       let second = data[dataOffset + 5] || 0;
      
//       // Validate date/time values (sanity check)
//       if (month > 12) month = month % 12 || 12;
//       if (day > 31) day = day % 31 || 31;
//       if (hour > 23) hour = hour % 24;
//       if (minute > 59) minute = minute % 60;
//       if (second > 59) second = second % 60;

//       // GPS info byte (quantity of satellites + positioning status)
//       const gpsInfo = data[dataOffset + 6];
//       const satelliteCount = (gpsInfo >> 4) & 0x0F;
//       const gpsValid = (gpsInfo & 0x01) === 0x01;

//       // Latitude (4 bytes)
//       const latRaw = data.readUInt32BE(dataOffset + 7);
//       const lat = latRaw / 1800000.0;

//       // Longitude (4 bytes)
//       const lonRaw = data.readUInt32BE(dataOffset + 11);
//       const lon = lonRaw / 1800000.0;

//       // Speed (1 byte)
//       const speed = data[dataOffset + 15];

//       // Course and status (2 bytes)
//       const courseStatus = data.readUInt16BE(dataOffset + 16);
//       const course = courseStatus & 0x03FF;
      
//       // ACC Status: bit 10 of courseStatus (0x0400 mask)
//       const accStatus = (courseStatus & 0x0400) ? 1 : 0;

//       // LBS info (optional)
//       let mcc = 0, mnc = 0, lac = 0, cellId = 0;
      
//       if (data.length > dataOffset + 22) {
//         try {
//           mcc = data.readUInt16BE(dataOffset + 18);
//           mnc = data[dataOffset + 20];
//           lac = data.readUInt16BE(dataOffset + 21);
//           cellId = data.length > dataOffset + 25 ? data.readUIntBE(dataOffset + 23, 3) : 0;
//         } catch (e) {
//           // LBS data not available
//         }
//       }

//       const timestamp = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;

//       let gpsQuality = 'No Fix';
//       if (gpsValid) {
//         if (satelliteCount >= 8) gpsQuality = 'Excellent';
//         else if (satelliteCount >= 6) gpsQuality = 'Good';
//         else if (satelliteCount >= 4) gpsQuality = 'Fair';
//         else gpsQuality = 'Weak';
//       }

//       // Determine GNSS type (for protocol 0xA2, might have additional info)
//       let gnssType = 'GPS';
//       if (protocol === 0xA2 && data.length > dataOffset + 50) {
//         // Extended protocols might indicate GLONASS/GPS/BDS
//         gnssType = 'GPS/GLONASS'; // Default assumption
//       }

//       return {
//         type: 'location',
//         protocol: protocol,
//         serial: serialNumber,
//         time: timestamp,
//         lat: lat,
//         lon: lon,
//         speed: speed,
//         course: course,
//         accStatus: accStatus, // 0 = OFF, 1 = ON
//         satellites: satelliteCount,
//         gpsValid: gpsValid,
//         gpsQuality: gpsQuality,
//         gnssType: gnssType,
//         signalStrength: satelliteCount >= 6 ? 'Strong' : satelliteCount >= 4 ? 'Medium' : satelliteCount >= 2 ? 'Weak' : 'Extremely poor',
//         mcc: mcc,
//         mnc: mnc,
//         lac: lac,
//         cellId: cellId
//       };
//     } catch (e) {
//       console.error('❌ PL601 Location decode error:', e.message);
//       return null;
//     }
//   }

//   /**
//    * Decode IMEI from BCD format
//    */
//   decodeIMEI(imeiBytes) {
//     let imei = '';
//     for (let i = 0; i < imeiBytes.length; i++) {
//       const byte = imeiBytes[i];
//       const high = (byte >> 4) & 0x0F;
//       const low = byte & 0x0F;
//       imei += high.toString() + low.toString();
//     }
    
//     imei = imei.replace(/^0+/, '');
    
//     if (imei.length > 15) {
//       imei = imei.slice(-15);
//     }
    
//     return imei;
//   }

//   /**
//    * Parse SMS response from device - ENHANCED VERSION
//    */
//   parseSMSResponse(data) {
//     try {
//       const text = data.toString('utf8').trim();
      
//       if (text.length < 3) {
//         return null;
//       }
      
//       console.log('📱 TEXT RESPONSE FROM DEVICE:');
//       console.log(text);
      
//       // VERSION response
//       if (text.includes('[VERSION]') || text.includes('VERSION')) {
//         const versionMatch = text.match(/\[VERSION\](.+?)(?:\[BUILD\]|$)/);
//         if (versionMatch) {
//           console.log(`🔧 Firmware Version: ${versionMatch[1].trim()}`);
//         }
//         return {
//           type: 'version',
//           text: text
//         };
//       }
      
//       // STATUS# response
//       if (text.includes('Battery:') || text.includes('GPRS:') || text.includes('GPS:')) {
//         console.log('📊 DEVICE STATUS RESPONSE:');
        
//         const batteryMatch = text.match(/Battery:(\d+\.?\d*)V,(\w+)/);
//         if (batteryMatch) {
//           const voltage = parseFloat(batteryMatch[1]);
//           const status = batteryMatch[2];
          
//           let percentage = 0;
//           if (voltage >= 4.1) percentage = 100;
//           else if (voltage >= 3.9) percentage = Math.round(70 + ((voltage - 3.9) / 0.2) * 30);
//           else if (voltage >= 3.7) percentage = Math.round(40 + ((voltage - 3.7) / 0.2) * 30);
//           else if (voltage >= 3.5) percentage = Math.round(10 + ((voltage - 3.5) / 0.2) * 30);
//           else percentage = Math.round(Math.max(0, (voltage - 3.3) / 0.2 * 10));
          
//           console.log(`🔋 Battery: ${voltage}V (${percentage}%) - ${status}`);
//         }
        
//         const gpsMatch = text.match(/GPS:(\w+)/);
//         if (gpsMatch) {
//           console.log(`🛰️  GPS Status: ${gpsMatch[1]}`);
//         }
        
//         const networkMatch = text.match(/(?:LTE|Network) Signal Level:(\w+)/);
//         if (networkMatch) {
//           console.log(`📶 Network Signal: ${networkMatch[1]}`);
//         }
        
//         return {
//           type: 'status',
//           text: text,
//           battery: batteryMatch ? {
//             voltage: parseFloat(batteryMatch[1]),
//             percentage: percentage,
//             status: batteryMatch[2]
//           } : null,
//           gps: gpsMatch ? gpsMatch[1] : null,
//           network: networkMatch ? networkMatch[1] : null
//         };
//       }
      
//       // POSITION# response
//       if (text.includes('maps.google.com')) {
//         console.log('📍 POSITION RESPONSE:');
//         const urlMatch = text.match(/https?:\/\/[^\s]+/);
//         if (urlMatch) {
//           console.log(`🗺️  ${urlMatch[0]}`);
          
//           const coordMatch = text.match(/q=([NS])?(\d+\.?\d*),([EW])?(\d+\.?\d*)/);
//           if (coordMatch) {
//             const lat = (coordMatch[1] === 'S' ? -1 : 1) * parseFloat(coordMatch[2]);
//             const lon = (coordMatch[3] === 'W' ? -1 : 1) * parseFloat(coordMatch[4]);
//             console.log(`📍 Coordinates: ${lat}, ${lon}`);
            
//             return {
//               type: 'position',
//               text: text,
//               lat: lat,
//               lon: lon,
//               url: urlMatch[0]
//             };
//           }
//         }
//         return {
//           type: 'position',
//           text: text
//         };
//       }

//       // GPRSSET# response - CRITICAL FOR DIAGNOSTICS
//       if (text.includes('GPRS:') && text.includes('Server:')) {
//         console.log('🌐 NETWORK CONFIGURATION RESPONSE:');
        
//         const serverMatch = text.match(/Server:(\d+),([^,]+),(\d+)/);
//         if (serverMatch) {
//           const serverType = serverMatch[1];
//           const serverAddress = serverMatch[2];
//           const serverPort = serverMatch[3];
          
//           console.log(`📡 Server Type: ${serverType === '0' ? 'IP' : 'Domain'}`);
//           console.log(`🖥️  Server Address: ${serverAddress}`);
//           console.log(`🔌 Server Port: ${serverPort}`);
          
//           // WARNING if not configured for local server
//           if (!serverAddress.includes('127.0.0.1') && !serverAddress.includes('localhost')) {
//             console.log('⚠️  WARNING: Device NOT configured for local server!');
//             console.log(`   Current server: ${serverAddress}:${serverPort}`);
//             console.log('   To receive TCP packets, configure device with:');
//             console.log('   SERVER,0,YOUR_IP,YOUR_PORT#');
//           }
//         }
        
//         return {
//           type: 'gprsset',
//           text: text
//         };
//       }

//       // SOS error - CRITICAL
//       if (text.includes('Only SOS phone numbers are allowed')) {
//         console.log('🚨 SOS RESTRICTION ERROR:');
//         console.log('   Your number is NOT in the SOS list!');
//         console.log('   Add your number with: SOS,A,YOUR_NUMBER#');
        
//         return {
//           type: 'sos_error',
//           text: text,
//           error: 'not_in_sos_list'
//         };
//       }
      
//       // Setting confirmation
//       if (text.includes('setting OK') || text.includes('setting successfully')) {
//         console.log('✅ Setting confirmed');
//         return {
//           type: 'setting_ok',
//           text: text
//         };
//       }
      
//       // Error messages
//       if (text.includes('Error!') || text.includes('error')) {
//         console.log('❌ Device Error:', text);
//         return {
//           type: 'error',
//           text: text
//         };
//       }
      
//       // MODE response
//       if (text.includes('Mode:')) {
//         const modeMatch = text.match(/Mode:(\d+)(?:,(\d+))?/);
//         if (modeMatch) {
//           const mode = modeMatch[1];
//           console.log(`⚙️  Device Mode: ${mode === '1' ? 'Timing' : mode === '2' ? 'Intelligent' : 'Unknown'}`);
//         }
//         return {
//           type: 'mode',
//           text: text
//         };
//       }
      
//       // RTMP command response e.g. "RTMP:OK!" or "RTMP:ERROR"
//       if (text.toUpperCase().startsWith('RTMP:')) {
//         const isOk = /OK/i.test(text);
//         console.log('🎬 RTMP RESPONSE FROM DEVICE:');
//         console.log(`   Text: ${text}`);
//         console.log(`   Status: ${isOk ? '✅ OK' : '❌ NOT OK'}`);
//         return {
//           type: 'rtmp_response',
//           ok: isOk,
//           text: text
//         };
//       }
      
//       // Server setting response
//       if (text.includes('Server:')) {
//         console.log('🌐 Server configuration confirmed');
//         return {
//           type: 'server',
//           text: text
//         };
//       }
      
//       // Generic response
//       if (text.length > 0 && text.length < 500) {
//         console.log('📨 Device Response:', text);
//         return {
//           type: 'text_response',
//           text: text
//         };
//       }
      
//       return null;
//     } catch (e) {
//       console.error('❌ SMS parse error:', e.message);
//       return null;
//     }
//   }

//   /**
//    * Get cached battery info
//    */
//   getBatteryInfo(imei) {
//     return this.deviceBatteryCache.get(imei) || {
//       voltage: null,
//       percentage: null,
//       status: 'UNKNOWN'
//     };
//   }

//   /**
//    * Main packet handler with enhanced diagnostics
//    */
//   async handlePacket(data, socket, deviceIMEI) {
//     const hexData = data.toString('hex').toUpperCase();
//     const hexFormatted = hexData.match(/../g).join(' ');
//     const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
    
//     console.log(`\n${'='.repeat(70)}`);
//     console.log(`[${timestamp}] 📦 PL601 PACKET RECEIVED (${data.length} bytes)`);
//     console.log(`${'='.repeat(70)}`);
//     console.log(`HEX: ${hexFormatted}`);
//     console.log(`ASCII: ${data.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
//     console.log(`${'='.repeat(70)}`);

//     // Detect communication mode
//     const firstByte = data[0];
//     const secondByte = data.length > 1 ? data[1] : 0;
    
//     const isBinaryPacket = (firstByte === 0x78 && secondByte === 0x78) || 
//                           (firstByte === 0x79 && secondByte === 0x79);
    
//     if (!isBinaryPacket) {
//       console.log('📱 Detected: TEXT/SMS RESPONSE (Primary mode for PL601)');
//       const smsResponse = this.parseSMSResponse(data);
//       if (smsResponse) {
//         console.log(`${'='.repeat(70)}\n`);
//         return { ...smsResponse, imei: deviceIMEI };
//       }
//       console.log(`${'='.repeat(70)}\n`);
//       return null;
//     }

//     console.log('🔢 Detected: BINARY PROTOCOL PACKET');

//     if (data.length < 5) {
//       console.log('⚠️  Packet too short');
//       console.log(`${'='.repeat(70)}\n`);
//       return null;
//     }

//     const length = data[2];
//     const protocol = data[3];
//     console.log(`📏 Length: ${length} (0x${length.toString(16).toUpperCase().padStart(2, '0')})`);
//     console.log(`📋 Protocol: 0x${protocol.toString(16).toUpperCase().padStart(2, '0')}`);

//     // LOGIN (0x01)
//     if (protocol === 0x01) {
//       const result = this.decodeLogin(data);
//       if (result) {
//         console.log('\n🔐 LOGIN PACKET DECODED');
//         console.log(`   IMEI: ${result.imei}`);
//         console.log(`   Device Type: ${result.machineType}`);
//         console.log(`   CRC Valid: ${result.crcValid ? '✅' : '❌'}`);

//         const ack = this.createResponsePacket(0x01, result.serial);
//         socket.write(ack);
        
//         const ackHex = ack.toString('hex').toUpperCase().match(/../g).join(' ');
//         console.log(`✅ Sent LOGIN ACK: ${ackHex}`);
//         console.log(`${'='.repeat(70)}\n`);

//         return result;
//       }
//     }
    
//     // HEARTBEAT (0x13)
//     else if (protocol === 0x13) {
//       const result = this.decodeHeartbeat(data);
//       if (result) {
//         console.log('\n💓 HEARTBEAT PACKET DECODED');
//         if (result.voltage) {
//           console.log(`   🔋 Battery: ${result.voltage.toFixed(2)}V (${result.batteryPercentage}%) - ${result.batteryStatus}`);
          
//           if (deviceIMEI) {
//             this.deviceBatteryCache.set(deviceIMEI, {
//               voltage: result.voltage,
//               percentage: result.batteryPercentage,
//               status: result.batteryStatus,
//               lastUpdate: new Date()
//             });
//           }
//         }
//         console.log(`   📶 Signal: ${result.signalLevel} (${result.gsmSignal})`);

//         const ack = this.createResponsePacket(0x13, result.serial);
//         socket.write(ack);
        
//         const ackHex = ack.toString('hex').toUpperCase().match(/../g).join(' ');
//         console.log(`✅ Sent HEARTBEAT ACK: ${ackHex}`);
//         console.log(`${'='.repeat(70)}\n`);

//         return { ...result, imei: deviceIMEI };
//       }
//     }
    
//     // LOCATION (multiple protocols including 0xA2 and 0x8A)
//     else if ([0x10, 0x11, 0x12, 0x16, 0x18, 0x1A, 0x20, 0x22, 0xA2, 0x8A].includes(protocol)) {
//       const result = this.decodeLocation(data);
//       if (result) {
//         console.log('\n🌍 LOCATION PACKET DECODED');
//         console.log(`   Protocol: 0x${result.protocol.toString(16).toUpperCase().padStart(2, '0')}`);
//         console.log(`   ⏰ Time: ${result.time}`);
//         console.log(`   📍 Coordinates: ${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}`);
//         console.log(`   🛰️  Satellites: ${result.satellites} | Quality: ${result.gpsQuality}`);
//         console.log(`   📡 GPS Valid: ${result.gpsValid ? '✅ YES' : '❌ NO'}`);
//         console.log(`   🚗 Speed: ${result.speed} km/h | Course: ${result.course}°`);
//         console.log(`   🔋 ACC Status: ${result.accStatus ? 'ON (0x01)' : 'OFF (0x00)'}`);
//         if (result.gnssType) console.log(`   🛰️  GNSS Type: ${result.gnssType}`);
//         if (result.signalStrength) console.log(`   📶 Signal: ${result.signalStrength}`);
//         console.log(`   🗺️  Google Maps: https://maps.google.com/?q=${result.lat},${result.lon}`);
        
//         if (deviceIMEI) {
//           const battery = this.getBatteryInfo(deviceIMEI);
//           if (battery.voltage) {
//             console.log(`   🔋 Battery: ${battery.voltage.toFixed(2)}V (${battery.percentage}%)`);
//           }
//         }

//         const ack = this.createResponsePacket(result.protocol, result.serial);
//         socket.write(ack);
        
//         const ackHex = ack.toString('hex').toUpperCase().match(/../g).join(' ');
//         console.log(`✅ Sent LOCATION ACK: ${ackHex}`);
//         console.log(`${'='.repeat(70)}\n`);

//         result.battery = deviceIMEI ? this.getBatteryInfo(deviceIMEI) : null;
//         return { ...result, imei: deviceIMEI || result.imei };
//       }
//     }
    
//     // Unknown protocols
//     else {
//       const serialNumber = data.length >= 6 ? data.readUInt16BE(data.length - 6) : 0x0000;
//       console.log(`❓ UNKNOWN PROTOCOL: 0x${protocol.toString(16).toUpperCase()}`);
//       console.log(`   Serial: 0x${serialNumber.toString(16).toUpperCase().padStart(4, '0')}`);

//       try {
//         const ack = this.createResponsePacket(protocol, serialNumber);
//         socket.write(ack);
        
//         const ackHex = ack.toString('hex').toUpperCase().match(/../g).join(' ');
//         console.log(`✅ Sent GENERIC ACK: ${ackHex}`);
//       } catch (e) {
//         console.log(`⚠️  Could not send ACK: ${e.message}`);
//       }

//       console.log(`${'='.repeat(70)}\n`);
//       return { type: 'unknown', protocol, serial: serialNumber, imei: deviceIMEI };
//     }

//     console.log(`${'='.repeat(70)}\n`);
//     return null;
//   }

//   /**
//    * Send SMS command to device
//    */
//   sendCommand(imei, command, activeConnections) {
//     const socket = activeConnections.get(imei);
//     if (!socket) {
//       console.error(`❌ Device ${imei} not connected`);
//       return false;
//     }

//     try {
//       // PL601 TCP text commands behave like SMS content but over a TCP stream.
//       // Many firmwares expect CRLF after '#' when command is delivered via TCP.
//       // So we always send "<COMMAND>#\r\n" on the wire.
//       const text = command.endsWith('#') ? command + '\r\n' : command + '#\r\n';
//       const commandBuffer = Buffer.from(text, 'utf8');
//       socket.write(commandBuffer);

//       const hexPreview = commandBuffer.toString('hex').toUpperCase().match(/../g)?.join(' ') || '';
//       console.log(`📤 Command sent to ${imei}: ${text.trim()}`);
//       console.log(`   HEX: ${hexPreview}`);
//       return true;
//     } catch (error) {
//       console.error(`❌ Error sending command:`, error.message);
//       return false;
//     }
//   }

//   // Command methods
//   requestLocation(imei, activeConnections) {
//     return this.sendCommand(imei, 'POSITION#', activeConnections);
//   }

//   requestStatus(imei, activeConnections) {
//     return this.sendCommand(imei, 'STATUS#', activeConnections);
//   }

//   requestGPRSSettings(imei, activeConnections) {
//     return this.sendCommand(imei, 'GPRSSET#', activeConnections);
//   }

//   addSOSNumber(imei, phoneNumber, activeConnections) {
//     return this.sendCommand(imei, `SOS,A,${phoneNumber}#`, activeConnections);
//   }

//   setServerIP(imei, serverIP, serverPort, activeConnections) {
//     return this.sendCommand(imei, `SERVER,0,${serverIP},${serverPort}#`, activeConnections);
//   }

//   setIntelligentMode(imei, activeConnections, updateInterval = 60) {
//     return this.sendCommand(imei, `MODE,2,${updateInterval},0,1,1,1,1#`, activeConnections);
//   }

//   setTimingMode(imei, activeConnections, interval = 30) {
//     return this.sendCommand(imei, `MODE,1,${interval},1,1,1#`, activeConnections);
//   }

//   activateMonitoring(imei, activeConnections) {
//     return this.sendCommand(imei, 'MONITOR#', activeConnections);
//   }

//   getDeviceModel() {
//     return 'PL601';
//   }

//   getDefaultDeviceName(imei) {
//     return `PL601-${imei.slice(-4)}`;
//   }

//   /**
//    * DIAGNOSTIC HELPER: Check device configuration
//    */
//   async diagnoseConnection(imei, activeConnections) {
//     console.log('\n🔧 RUNNING DEVICE DIAGNOSTICS...\n');
    
//     // Step 1: Check connection
//     const socket = activeConnections.get(imei);
//     if (!socket) {
//       console.log('❌ Device not connected to TCP server');
//       console.log('   Action: Wait for device to connect or check network settings');
//       return false;
//     }
//     console.log('✅ Device connected to TCP server');
    
//     // Step 2: Request GPRS settings
//     console.log('\n📡 Requesting GPRS configuration...');
//     this.requestGPRSSettings(imei, activeConnections);
    
//     // Step 3: Wait for response
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     // Step 4: Request SOS list
//     console.log('\n📞 Requesting SOS numbers...');
//     this.sendCommand(imei, 'SOS#', activeConnections);
    
//     await new Promise(resolve => setTimeout(resolve, 2000));
    
//     // Step 5: Request current mode
//     console.log('\n⚙️  Requesting device mode...');
//     this.sendCommand(imei, 'MODE#', activeConnections);
    
//     console.log('\n✅ Diagnostics complete. Check responses above.\n');
//     return true;
//   }

//   /**
//    * SETUP WIZARD: Configure device for TCP communication
//    */
//   async setupDeviceForTCP(imei, phoneNumber, serverIP, serverPort, activeConnections) {
//     console.log('\n🚀 STARTING DEVICE SETUP WIZARD...\n');
    
//     const socket = activeConnections.get(imei);
//     if (!socket) {
//       console.log('❌ Device not connected. Cannot configure.');
//       return false;
//     }
    
//     // Step 1: Add phone to SOS list
//     console.log('Step 1/4: Adding phone number to SOS list...');
//     this.addSOSNumber(imei, phoneNumber, activeConnections);
//     await new Promise(resolve => setTimeout(resolve, 3000));
    
//     // Step 2: Configure server
//     console.log('\nStep 2/4: Configuring TCP server...');
//     this.setServerIP(imei, serverIP, serverPort, activeConnections);
//     await new Promise(resolve => setTimeout(resolve, 3000));
    
//     // Step 3: Set timing mode
//     console.log('\nStep 3/4: Setting timing mode (30 second updates)...');
//     this.setTimingMode(imei, activeConnections, 30);
//     await new Promise(resolve => setTimeout(resolve, 3000));
    
//     // Step 4: Verify settings
//     console.log('\nStep 4/4: Verifying configuration...');
//     this.sendCommand(imei, 'SOS#', activeConnections);
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     this.sendCommand(imei, 'GPRSSET#', activeConnections);
//     await new Promise(resolve => setTimeout(resolve, 1000));
//     this.sendCommand(imei, 'MODE#', activeConnections);
    
//     console.log('\n✅ SETUP COMPLETE!\n');
//     console.log('Expected behavior:');
//     console.log('  - Device will reconnect to new server');
//     console.log('  - Location packets every 30 seconds');
//     console.log('  - Your phone can query position\n');
    
//     return true;
//   }

//   /**
//    * Quick command: Enable real-time tracking
//    */
//   enableRealTimeTracking(imei, activeConnections, interval = 10, duration = 300) {
//     console.log(`\n📍 Enabling real-time tracking...`);
//     console.log(`   Update interval: ${interval}s`);
//     console.log(`   Duration: ${duration}s (${Math.floor(duration/60)}min)\n`);
//     return this.sendCommand(imei, `LT,ON,${interval},${duration},1,1,1#`, activeConnections);
//   }

//   /**
//    * Quick command: Disable real-time tracking
//    */
//   disableRealTimeTracking(imei, activeConnections) {
//     console.log('\n⏸️  Disabling real-time tracking...\n');
//     return this.sendCommand(imei, 'LT,OFF,10,120,1,1,1#', activeConnections);
//   }

//   /**
//    * Quick command: Get device parameters
//    */
//   getDeviceParameters(imei, activeConnections) {
//     console.log('\n📋 Requesting device parameters...\n');
//     return this.sendCommand(imei, 'PARAM#', activeConnections);
//   }

//   /**
//    * Quick command: Get firmware version
//    */
//   getFirmwareVersion(imei, activeConnections) {
//     console.log('\n🔧 Requesting firmware version...\n');
//     return this.sendCommand(imei, 'VERSION#', activeConnections);
//   }

//   /**
//    * Quick command: Factory reset (use with caution!)
//    */
//   factoryReset(imei, activeConnections) {
//     console.log('\n⚠️  WARNING: Initiating factory reset...');
//     console.log('   Device will reboot and lose all settings!\n');
//     return this.sendCommand(imei, 'FACTORY#', activeConnections);
//   }

//   /**
//    * Quick command: Remote shutdown
//    */
//   remoteShutdown(imei, activeConnections) {
//     console.log('\n🔴 Sending remote shutdown command...\n');
//     return this.sendCommand(imei, 'SHUTDOWN#', activeConnections);
//   }

//   /**
//    * Quick command: Set low battery alarm
//    */
//   setLowBatteryAlarm(imei, activeConnections, enabled = true) {
//     const setting = enabled ? 'ON' : 'OFF';
//     console.log(`\n🔋 ${enabled ? 'Enabling' : 'Disabling'} low battery alarm...\n`);
//     return this.sendCommand(imei, `BATALM,${setting},0,1,2#`, activeConnections);
//   }

//   /**
//    * Quick command: Configure SOS alarm
//    */
//   setSOSAlarm(imei, activeConnections, enabled = true, notifyMode = 3) {
//     const setting = enabled ? 'ON' : 'OFF';
//     console.log(`\n🚨 ${enabled ? 'Enabling' : 'Disabling'} SOS alarm...\n`);
//     console.log(`   Notification mode: ${notifyMode}`);
//     console.log('   0=GPRS only, 1=SMS+GPRS, 2=GPRS+SMS+Call, 3=GPRS+Call\n');
//     return this.sendCommand(imei, `SOSALM,${setting},${notifyMode}#`, activeConnections);
//   }

//   /**
//    * Quick command: Set timezone
//    */
//   setTimezone(imei, activeConnections, direction = 'E', hours = 5, minutes = 30) {
//     console.log(`\n🌍 Setting timezone to GMT${direction}${hours}:${minutes}...\n`);
//     const minutesParam = minutes === 0 ? 0 : minutes === 15 ? 15 : minutes === 30 ? 30 : 45;
//     return this.sendCommand(imei, `GMT,${direction},${hours},${minutesParam}#`, activeConnections);
//   }

//   /**
//    * Quick command: Set APN
//    */
//   setAPN(imei, activeConnections, apn, username = '', password = '') {
//     console.log(`\n📶 Setting APN to: ${apn}\n`);
//     if (username && password) {
//       return this.sendCommand(imei, `APN,${apn},${username},${password}#`, activeConnections);
//     }
//     return this.sendCommand(imei, `APN,${apn}#`, activeConnections);
//   }

//   /**
//    * Quick command: One-time audio recording
//    */
//   recordAudio(imei, activeConnections, duration = 30) {
//     console.log(`\n🎤 Starting ${duration}s audio recording...\n`);
//     return this.sendCommand(imei, `LY,${duration}#`, activeConnections);
//   }

//   /**
//    * Quick command: Continuous audio recording
//    */
//   startContinuousRecording(imei, activeConnections, chunkDuration = 30) {
//     console.log(`\n🎙️  Starting continuous recording (${chunkDuration}s chunks)...\n`);
//     return this.sendCommand(imei, `CXLY,ON,${chunkDuration}#`, activeConnections);
//   }

//   stopContinuousRecording(imei, activeConnections) {
//     console.log('\n⏹️  Stopping continuous recording...\n');
//     return this.sendCommand(imei, 'CXLY,OFF,30#', activeConnections);
//   }

//   /**
//    * RTMP streaming is NOT handled via server for PL601 now.
//    * Keep this method as a stub so callers don't break, but always log+return false.
//    */
//   startRTMPStream(imei, rtmpUrl = null, cameraIndex = 0, durationMinutes = 15, activeConnections) {
//     console.log(`\n🎥 PL601 startRTMPStream requested for IMEI: ${imei} — RTMP is disabled for PL601 (use JC261 only).\n`);
//     return Promise.resolve(false);
//   }

//   /**
//    * Stub for RTMP stop on PL601 – no-op, just logs.
//    */
//   stopRTMPStream(imei, activeConnections) {
//     console.log(`\n🛑 PL601 stopRTMPStream requested for IMEI: ${imei} — RTMP is disabled for PL601 (use JC261 only).\n`);
//     return false;
//   }

//   /**
//    * Get detailed device info summary
//    */
//   getDeviceInfo() {
//     return {
//       model: 'PL601',
//       manufacturer: 'Shenzhen Jimi IoT Co., Ltd.',
//       features: [
//         'GPS/GLONASS tracking',
//         'WiFi positioning',
//         'LTE cellular',
//         'Voice monitoring',
//         'Audio recording',
//         'SOS emergency button',
//         'Low battery alarm',
//         'Remote shutdown',
//         'Geofencing',
//         'Real-time tracking'
//       ],
//       protocols: {
//         login: '0x01',
//         heartbeat: '0x13',
//         location: ['0x10', '0x11', '0x12', '0x16', '0x18', '0x1A', '0x20', '0x22']
//       },
//       communication: {
//         primary: 'SMS/Text Commands',
//         secondary: 'TCP Binary Protocol',
//         port: '8081 (default)'
//       }
//     };
//   }
// }

// export default PL601Protocol;