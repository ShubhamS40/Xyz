/**
 * VL502 Protocol Parser
 * Based on: Jimi IoT Communication Protocol V1.2.3
 * 
 * Key Protocol Rules:
 * - Frame: 0x7E | [escaped data] | 0x7E
 * - Escape: 0x7E -> 0x7D 0x02, 0x7D -> 0x7D 0x01
 * - Checksum: XOR of all bytes (header + body)
 * - Terminal SN: 6-byte UInt48 BE (first 14 digits of IMEI)
 */

class VL502Parser {
  /**
   * Parse incoming VL502 message
   * @param {Buffer} buffer - Raw message with delimiters
   * @returns {Object|null} Parsed message or null if invalid
   */
  parseMessage(buffer) {
    try {
      console.log('🔍 VL502 Parser: Starting message parse...');
      console.log(`   Raw length: ${buffer.length} bytes`);
      console.log(`   Raw hex: ${buffer.toString('hex')}`);

      // ══════════════════════════════════════════════════════════════
      // STEP 1: Validate delimiters
      // ══════════════════════════════════════════════════════════════
      if (buffer[0] !== 0x7E || buffer[buffer.length - 1] !== 0x7E) {
        console.error('❌ Invalid frame: missing 0x7E delimiters');
        return null;
      }

      // ══════════════════════════════════════════════════════════════
      // STEP 2: Strip delimiters and unescape
      // ══════════════════════════════════════════════════════════════
      const unescaped = this.unescapeMessage(buffer.slice(1, -1));
      console.log(`   Unescaped length: ${unescaped.length} bytes`);
      console.log(`   Unescaped hex: ${unescaped.toString('hex')}`);

      // Minimum: header(12) + checksum(1) = 13 bytes
      if (unescaped.length < 13) {
        console.error(`❌ Message too short: ${unescaped.length} bytes (minimum 13)`);
        return null;
      }

      // ══════════════════════════════════════════════════════════════
      // STEP 3: Verify checksum
      // ══════════════════════════════════════════════════════════════
      const checksumByte = unescaped[unescaped.length - 1];
      let calculatedChecksum = 0;
      for (let i = 0; i < unescaped.length - 1; i++) {
        calculatedChecksum ^= unescaped[i];
      }

      console.log(`   Checksum: received=0x${checksumByte.toString(16).padStart(2, '0')}, calculated=0x${calculatedChecksum.toString(16).padStart(2, '0')}`);

      if (checksumByte !== calculatedChecksum) {
        console.error(`❌ Checksum mismatch!`);
        return null;
      }

      // ══════════════════════════════════════════════════════════════
      // STEP 4: Parse header (12 bytes)
      // ══════════════════════════════════════════════════════════════
      let offset = 0;
      
      const messageId = unescaped.readUInt16BE(offset); 
      offset += 2;
      
      const bodyProperties = unescaped.readUInt16BE(offset); 
      offset += 2;

      // Terminal SN: 6 bytes as UInt48 (NOT BCD!)
      // Protocol: "Convert first 14 digits of IMEI to 6-byte hex"
      // Example: IMEI 86499306096800 -> SN bytes -> decode to "86499306096800"
      const terminalSNBytes = unescaped.slice(offset, offset + 6);
      const terminalSN = this.parseTerminalSN(terminalSNBytes);
      offset += 6;

      const sequenceNumber = unescaped.readUInt16BE(offset); 
      offset += 2;

      // Body length from bits 0-9 of bodyProperties
      const bodyLength = bodyProperties & 0x3FF;
      const isEncrypted = (bodyProperties >> 10) & 0x07;
      const isSegmented = (bodyProperties >> 13) & 0x01;

      console.log('');
      console.log('📋 HEADER PARSED:');
      console.log(`   Message ID:       0x${messageId.toString(16).padStart(4, '0')} (${this.getMessageName(messageId)})`);
      console.log(`   Terminal SN:      ${terminalSN} (14-digit IMEI)`);
      console.log(`   Sequence Number:  ${sequenceNumber}`);
      console.log(`   Body Length:      ${bodyLength} bytes`);
      console.log(`   Encrypted:        ${isEncrypted !== 0 ? 'Yes' : 'No'}`);
      console.log(`   Segmented:        ${isSegmented !== 0 ? 'Yes' : 'No'}`);

      // ══════════════════════════════════════════════════════════════
      // STEP 5: Extract message body
      // ══════════════════════════════════════════════════════════════
      if (offset + bodyLength > unescaped.length - 1) {
        console.error(`❌ Body length overflow: declared=${bodyLength}, available=${unescaped.length - offset - 1}`);
        return null;
      }

      const messageBody = unescaped.slice(offset, offset + bodyLength);
      console.log(`   Body hex:         ${messageBody.toString('hex')}`);

      return {
        messageId,
        terminalSN,
        sequenceNumber,
        bodyProperties,
        bodyLength,
        messageBody,
        isEncrypted: isEncrypted !== 0,
        isSegmented: isSegmented !== 0
      };

    } catch (error) {
      console.error('❌ Parse error:', error.message);
      console.error(error.stack);
      return null;
    }
  }

  /**
   * Parse Terminal SN from 6 bytes
   * Protocol: First 14 digits of IMEI converted to 6-byte hex (UInt48 big-endian)
   * This is NOT BCD encoding!
   * 
   * @param {Buffer} buffer - 6-byte Terminal SN
   * @returns {string} 14-digit IMEI string
   */
  parseTerminalSN(buffer) {
    // Read as 48-bit unsigned integer (big-endian)
    const val = buffer.readUIntBE(0, 6);
    const imei = val.toString().padStart(14, '0');
    
    console.log(`   Terminal SN bytes: ${buffer.toString('hex')}`);
    console.log(`   Terminal SN value: ${val}`);
    console.log(`   Terminal SN IMEI:  ${imei}`);
    
    return imei;
  }

  /**
   * Unescape VL502 message
   * Rules: 0x7D 0x02 -> 0x7E, 0x7D 0x01 -> 0x7D
   */
  unescapeMessage(buffer) {
    const result = [];
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === 0x7D && i + 1 < buffer.length) {
        if (buffer[i + 1] === 0x02) {
          result.push(0x7E);
          i++; // Skip next byte
        } else if (buffer[i + 1] === 0x01) {
          result.push(0x7D);
          i++; // Skip next byte
        } else {
          result.push(buffer[i]);
        }
      } else {
        result.push(buffer[i]);
      }
    }
    return Buffer.from(result);
  }

  /**
   * Get human-readable message name
   */
  getMessageName(messageId) {
    const names = {
      0x0002: 'Heartbeat',
      0x0003: 'Logout',
      0x0100: 'Registration',
      0x0102: 'Authentication',
      0x0104: 'Parameter Query Response',
      0x0108: 'Upgrade Result',
      0x0200: 'Location Report',
      0x0900: 'Data Uplink',
      0x8001: 'Platform General Response',
      0x8100: 'Registration Response',
      0x8103: 'Set Parameters',
      0x8105: 'Terminal Control',
      0x8106: 'Query Parameters',
      0x8900: 'Data Downlink'
    };
    return names[messageId] || 'Unknown';
  }

  // ══════════════════════════════════════════════════════════════════
  // MESSAGE BODY PARSERS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Parse registration message (0x0100)
   * Per protocol Table 8
   */
  parseRegistration(body) {
    console.log('');
    console.log('📝 PARSING REGISTRATION (0x0100):');
    
    let offset = 0;

    const deviceManufacturer = body.readUInt16BE(offset); 
    offset += 2;
    console.log(`   Device Manufacturer: 0x${deviceManufacturer.toString(16).padStart(4, '0')} ${deviceManufacturer === 0x4A4D ? '(Jimi)' : ''}`);

    const authLevel = body.readUInt16BE(offset); 
    offset += 2;
    console.log(`   Auth Level: ${authLevel}`);

    // Device Type: 5-byte ASCII string
    const deviceType = body.slice(offset, offset + 5).toString('utf-8').replace(/\0/g, '');
    offset += 5;
    console.log(`   Device Type: "${deviceType}"`);

    // ICCID: 20-byte ASCII string
    const iccid = body.slice(offset, offset + 20).toString('utf-8').replace(/\0/g, '');
    offset += 20;
    console.log(`   ICCID: "${iccid}"`);

    // Terminal SN Suffix: 7-byte ASCII string (last 7 digits)
    // IMPORTANT: These are ASCII characters like "0000007", NOT the full IMEI!
    const terminalSNSuffix = body.slice(offset, offset + 7).toString('utf-8').replace(/\0/g, '');
    offset += 7;
    console.log(`   Terminal SN Suffix: "${terminalSNSuffix}" (last 7 digits only)`);

    const licensePlateColor = body.readUInt8(offset); 
    offset += 1;
    console.log(`   License Plate Color: ${licensePlateColor} ${this.getColorName(licensePlateColor)}`);

    // Remaining bytes: license plate or VIN
    const vehicleIdentification = body.slice(offset).toString('utf-8').replace(/\0/g, '');
    console.log(`   Vehicle ID: "${vehicleIdentification}" ${licensePlateColor === 0 ? '(VIN)' : '(License Plate)'}`);

    return {
      deviceManufacturer,
      authLevel,
      deviceType,
      iccid,
      terminalSNSuffix,
      licensePlateColor,
      vehicleIdentification
    };
  }

  /**
   * Parse location report (0x0200)
   */
  parseLocationReport(body) {
    console.log('');
    console.log('📍 PARSING LOCATION REPORT (0x0200):');
    
    let offset = 0;

    const alarmFlag = body.readUInt32BE(offset); 
    offset += 4;

    const status = body.readUInt32BE(offset); 
    offset += 4;

    const latRaw = body.readUInt32BE(offset); 
    offset += 4;
    const lonRaw = body.readUInt32BE(offset); 
    offset += 4;

    // Apply N/S and E/W from status bits
    const latitude = (status & 0x04) ? -(latRaw / 1000000) : (latRaw / 1000000);
    const longitude = (status & 0x08) ? -(lonRaw / 1000000) : (lonRaw / 1000000);

    const altitude = body.readInt16BE(offset); 
    offset += 2;

    const speed = body.readUInt16BE(offset) / 10; 
    offset += 2;

    const direction = body.readUInt16BE(offset); 
    offset += 2;

    // Time: BCD[6] YY-MM-DD-HH-MM-SS
    const timestamp = this.parseBCDTime(body.slice(offset, offset + 6));
    offset += 6;

    console.log(`   Alarm Flag: 0x${alarmFlag.toString(16).padStart(8, '0')}`);
    console.log(`   Status: 0x${status.toString(16).padStart(8, '0')}`);
    console.log(`   ACC: ${status & 0x01 ? 'ON' : 'OFF'}`);
    console.log(`   Located: ${status & 0x02 ? 'YES' : 'NO'}`);
    console.log(`   Position: ${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°`);
    console.log(`   Altitude: ${altitude}m`);
    console.log(`   Speed: ${speed.toFixed(1)} km/h`);
    console.log(`   Direction: ${direction}°`);
    console.log(`   Time: ${timestamp.toISOString()}`);

    // Additional information items
    const additionalInfo = this.parseAdditionalInfo(body.slice(offset));

    return {
      alarmFlag,
      status,
      latitude,
      longitude,
      altitude,
      speed,
      direction,
      timestamp,
      accOn: !!(status & 0x01),
      positioned: !!(status & 0x02),
      ...additionalInfo
    };
  }

  /**
   * Parse BCD time: YY-MM-DD-HH-MM-SS
   */
  parseBCDTime(buffer) {
    const year = parseInt(buffer[0].toString(16), 10) + 2000;
    const month = parseInt(buffer[1].toString(16), 10) - 1;
    const day = parseInt(buffer[2].toString(16), 10);
    const hour = parseInt(buffer[3].toString(16), 10);
    const min = parseInt(buffer[4].toString(16), 10);
    const sec = parseInt(buffer[5].toString(16), 10);
    return new Date(year, month, day, hour, min, sec);
  }

  /**
   * Parse additional info items (TLV format)
   */
  parseAdditionalInfo(buffer) {
    const info = {};
    let offset = 0;

    console.log(`   Additional Info:`);

    while (offset + 2 <= buffer.length) {
      const id = buffer.readUInt8(offset); 
      offset++;
      const length = buffer.readUInt8(offset); 
      offset++;

      if (offset + length > buffer.length) break;

      const value = buffer.slice(offset, offset + length);
      offset += length;

      switch (id) {
        case 0x01: // GPS mileage
          if (length === 4) {
            info.gpsMileage = value.readUInt32BE(0) / 10;
            console.log(`     0x01 GPS Mileage: ${info.gpsMileage} km`);
          }
          break;
        case 0x2A: // IO status
          if (length === 2) {
            info.ioStatus = value.readUInt16BE(0);
            console.log(`     0x2A IO Status: 0x${info.ioStatus.toString(16)}`);
          }
          break;
        case 0x30: // Signal strength
          if (length === 1) {
            info.signalStrength = value.readUInt8(0);
            console.log(`     0x30 Signal: ${info.signalStrength}`);
          }
          break;
        case 0x31: // GNSS satellites
          if (length === 1) {
            info.satellites = value.readUInt8(0);
            console.log(`     0x31 Satellites: ${info.satellites}`);
          }
          break;
        case 0xE4: // Status extension
          info.statusExtension = this.parseStatusExtension(value);
          break;
        default:
          console.log(`     0x${id.toString(16)} (${length} bytes): ${value.toString('hex')}`);
      }
    }

    return info;
  }

  /**
   * Parse status extension (0xE4)
   */
  parseStatusExtension(buffer) {
    if (buffer.length < 5) return {};

    const ext = {
      chargingConnected: buffer.readUInt8(0),
      batteryLevel: buffer.readUInt8(1),
      batteryVoltage: buffer.readUInt16BE(2) / 100,
      gsmSignalLevel: buffer.readUInt8(4)
    };

    if (buffer.length >= 7) {
      ext.externalVoltage = buffer.readUInt16BE(5) / 100;
    }

    console.log(`     0xE4 Battery: ${ext.batteryVoltage}V (level ${ext.batteryLevel})`);
    console.log(`     0xE4 Charging: ${ext.chargingConnected ? 'Yes' : 'No'}`);
    console.log(`     0xE4 GSM Signal: ${ext.gsmSignalLevel}`);
    if (ext.externalVoltage) {
      console.log(`     0xE4 External: ${ext.externalVoltage}V`);
    }

    return ext;
  }

  /**
   * Parse data uplink (0x0900)
   */
  parseDataUplink(body) {
    console.log('');
    console.log('📊 PARSING DATA UPLINK (0x0900):');
    
    if (body.length < 1) return null;

    const transparentType = body.readUInt8(0);
    console.log(`   Transparent Type: 0x${transparentType.toString(16)}`);

    if (transparentType === 0xF0) {
      return this.parseF0Uplink(body);
    } else if (transparentType === 0xF3) {
      return this.parseF3Uplink(body);
    } else {
      console.log(`   Other type - raw data (${body.length - 1} bytes)`);
      return { transparentType, data: body.slice(1) };
    }
  }

  /**
   * Parse F0 uplink (OBD/vehicle data)
   */
  parseF0Uplink(body) {
    if (body.length < 10) return null;

    let offset = 1; // Skip type byte

    const eventTime = this.parseBCDTime(body.slice(offset, offset + 6));
    offset += 6;

    const dataType = body.readUInt8(offset);
    offset++;

    const vehicleType = body.readUInt8(offset);
    offset++;

    const subcategory = body.readUInt8(offset);
    offset++;

    console.log(`   Event Time: ${eventTime.toISOString()}`);
    console.log(`   Data Type: ${dataType === 0 ? 'Real-time' : 'Re-upload'}`);
    console.log(`   Vehicle Type: ${vehicleType}`);
    console.log(`   Subcategory: 0x${subcategory.toString(16)} ${this.getSubcategoryName(subcategory)}`);

    const rawData = body.slice(offset);
    let parsedData = null;

    // Parse OBD data stream (subcategory 0x01)
    if (subcategory === 0x01) {
      parsedData = this.parseOBDDataStream(rawData);
    }

    return {
      transparentType: 0xF0,
      eventTime,
      dataType,
      vehicleType,
      subcategory,
      rawData,
      parsedData
    };
  }

  /**
   * Parse OBD data stream (Table 25 in protocol)
   */
  parseOBDDataStream(data) {
    if (data.length < 1) return null;

    const result = {
      dataStreams: {},
      location: null
    };

    let offset = 0;
    const totalCount = data.readUInt8(offset);
    offset++;

    console.log(`   📊 OBD Data Streams: ${totalCount} items`);

    // Parse each data stream
    for (let i = 0; i < totalCount && offset < data.length - 12; i++) {
      if (offset + 3 > data.length) break;

      const dataId = data.readUInt16BE(offset);
      offset += 2;

      const dataLength = data.readUInt8(offset);
      offset++;

      if (offset + dataLength > data.length) break;

      const rawValue = data.slice(offset, offset + dataLength);
      offset += dataLength;

      const parsedValue = this.parseOBDValue(dataId, rawValue, dataLength);
      
      if (parsedValue !== null) {
        result.dataStreams[dataId] = parsedValue;
        console.log(`      [0x${dataId.toString(16).padStart(4, '0')}] ${parsedValue.name}: ${parsedValue.displayValue}`);
      }
    }

    // Parse location data at the end (Status + Lat + Lon)
    if (offset + 12 <= data.length) {
      const status = data.readUInt32BE(offset);
      offset += 4;

      const latitude = data.readUInt32BE(offset) / 1000000;
      offset += 4;

      const longitude = data.readUInt32BE(offset) / 1000000;
      offset += 4;

      result.location = {
        status,
        latitude,
        longitude,
        accOn: (status & 0x01) === 0x01,
        positioned: (status & 0x02) === 0x02
      };

      console.log(`   📍 Location: ${latitude}, ${longitude} (ACC: ${result.location.accOn ? 'ON' : 'OFF'})`);
    }

    return result;
  }

  /**
   * Parse individual OBD data value based on Data ID (Table 25)
   */
  parseOBDValue(dataId, rawValue, length) {
    const parseUInt = (buf, len) => {
      if (len === 1) return buf.readUInt8(0);
      if (len === 2) return buf.readUInt16BE(0);
      if (len === 4) return buf.readUInt32BE(0);
      return 0;
    };

    const value = parseUInt(rawValue, length);

    // Map of Data IDs to parsing rules (from Table 25 in protocol)
    const dataIdMap = {
      // Commercial vehicle data streams
      0x0528: { name: 'Total Vehicle Mileage', unit: 'km', calc: v => v / 10 },
      0x052C: { name: 'Total Vehicle Fuel Consumption', unit: 'L', calc: v => v / 100 },
      0x0102: { name: 'Vehicle Mileage', unit: 'km', calc: v => v / 10 },
      0x0103: { name: 'Vehicle Fuel', unit: 'L', calc: v => v / 100 },
      0x0546: { name: 'Accumulated Mileage', unit: 'km', calc: v => v / 10 },
      0x0105: { name: 'Cumulative Fuel Consumption', unit: 'L', calc: v => v / 100 },
      0x0539: { name: 'Instant Fuel Consumption', unit: 'L/H', calc: v => v / 100 },
      0x0537: { name: 'Fuel Consumption Avg', unit: 'L/100KM', calc: v => v / 100 },
      0x0536: { name: 'Instantaneous RPM', unit: 'RPM', calc: v => v },
      0x0535: { name: 'Speed', unit: 'km/h', calc: v => v / 10 },
      0x0530: { name: 'Vehicle Battery Voltage', unit: 'mV', calc: v => v },
      0x052D: { name: 'Coolant Temperature', unit: '°C', calc: v => v - 40 },
      0x053D: { name: 'Intake Manifold Absolute Pressure', unit: 'kPa', calc: v => v / 10 },
      0x053C: { name: 'Inlet Flow', unit: 'g/s', calc: v => v / 10 },
      0x010E: { name: 'Fuel Injection', unit: 'ml/s', calc: v => v / 10 },
      0x010F: { name: 'Oil Temperature', unit: '°C', calc: v => v - 273 },
      0x053B: { name: 'Oil Pressure', unit: 'kPa', calc: v => v / 10 },
      0x0111: { name: 'Fuel Temperature', unit: '°C', calc: v => v - 40 },
      0x052E: { name: 'Engine Inlet Air Temperature', unit: '°C', calc: v => v - 40 },
      0x0113: { name: 'Torque', unit: 'Nm', calc: v => v },
      0x0114: { name: 'Engine Load', unit: '%', calc: v => v },
      0x0544: { name: "Tank's Liquid Level", unit: '%', calc: v => v },
      0x053F: { name: 'Accelerator Pedal Position', unit: '%', calc: v => v },
      0x0547: { name: 'Relative Throttle Opening', unit: '%', calc: v => v },
      0x0548: { name: 'Absolute Throttle Opening', unit: '%', calc: v => v },
      
      // J1939 parameters
      0xF004: { name: 'Engine Speed', unit: 'rpm', calc: v => v * 0.125 },
      0xFEF1: { name: 'Wheel-Based Vehicle Speed', unit: 'km/h', calc: v => v / 256 },
      0xFEEC: { name: 'VIN', unit: '', calc: v => rawValue.toString('ascii') },
      0xFEE0: { name: 'Total Vehicle Distance', unit: 'km', calc: v => v * 0.125 },
      0xF003: { name: 'Engine Percent Load', unit: '%', calc: v => v },
      0xFEF6: { name: 'Engine Turbocharger Boost Pressure', unit: 'kPa', calc: v => v * 2 },
      0xFEEE: { name: 'Engine Coolant Temperature', unit: '°C', calc: v => v - 40 },
      0xFEE9: { name: 'Engine Total Fuel Used', unit: 'L', calc: v => v * 0.5 },
      0xFEFC: { name: 'Fuel Level 1', unit: '%', calc: v => v * 0.4 },
      0xE003: { name: 'Accelerator Pedal Position 1', unit: '%', calc: v => v * 0.4 },
      0xFEF2: { name: 'Engine Throttle Valve 1 Position 1', unit: '%', calc: v => v * 0.4 },
      0xF00A: { name: 'Engine Intake Air Mass Flow Rate', unit: 'kg/h', calc: v => v * 0.05 },
      0xFEF5: { name: 'Barometric Pressure', unit: 'kPa', calc: v => v * 0.5 },
      0xFEC1: { name: 'High Resolution Total Vehicle Distance', unit: 'km', calc: v => v * 0.005 },
      0xFDB8: { name: 'Time Since Engine Start', unit: 's', calc: v => v },
      0xEEF6: { name: 'Intake Manifold Temperature', unit: '°C', calc: v => v - 40 },
      0xE002: { name: 'Actual Engine Percent Torque', unit: '%', calc: v => v - 125 },
      0xFEE5: { name: 'Engine Total Hours of Operation', unit: 'hr', calc: v => v * 0.05 },
      0xFD09: { name: 'High resolution engine total fuel used', unit: 'L', calc: v => v * 0.001 },
      0xFE56: { name: 'Aftertreatment 1 Diesel Exhaust Fluid Tank Level', unit: '%', calc: v => v * 0.4 },
    };

    const definition = dataIdMap[dataId];
    
    if (!definition) {
      return null; // Unknown data ID
    }

    const calculatedValue = definition.calc(value);
    
    return {
      name: definition.name,
      unit: definition.unit,
      rawValue: value,
      value: calculatedValue,
      displayValue: definition.unit ? `${calculatedValue.toFixed(2)}${definition.unit}` : calculatedValue
    };
  }

  /**
   * Parse F3 uplink (peripheral data)
   */
  parseF3Uplink(body) {
    if (body.length < 5) return null;

    let offset = 1; // Skip type byte

    const type = body.readUInt16BE(offset);
    offset += 2;

    const len = body.readUInt16BE(offset);
    offset += 2;

    const value = body.slice(offset, offset + len);

    console.log(`   Peripheral Type: 0x${type.toString(16)}`);
    console.log(`   Data Length: ${len}`);
    console.log(`   Data: ${value.toString('hex')}`);

    return {
      transparentType: 0xF3,
      peripheralType: type,
      data: value
    };
  }

  /**
   * Get subcategory name
   */
  getSubcategoryName(subcategory) {
    const names = {
      0x01: 'OBD Data Stream',
      0x02: 'Trouble Codes',
      0x03: 'Alarms/Driving Behavior',
      0x04: 'Trip Data',
      0x05: 'OBD MCU Log',
      0x06: 'CAN Learning Data',
      0x0B: 'VIN Upload'
    };
    return names[subcategory] || 'Unknown';
  }

  /**
   * Get color name
   */
  getColorName(code) {
    const colors = {
      0: '(None)',
      1: '(Blue)',
      2: '(Yellow)',
      3: '(Black)',
      4: '(White)',
      5: '(Green)',
      9: '(Other)'
    };
    return colors[code] || '';
  }
}

export default VL502Parser;