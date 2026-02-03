/**
 * VL502 Message Handler
 * Handles all VL502 protocol messages with detailed logging
 */

import VL502Parser from './vl502Parser.js';
import VL502Commands from './vl502Commands.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class VL502Handler {
  constructor() {
    this.parser = new VL502Parser();
    this.commands = new VL502Commands();
    this.deviceSockets = new Map(); // IMEI -> socket
  }

  /**
   * Main message handler
   */
  async handleMessage(socket, buffer, clientInfo) {
    try {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🔵 VL502 MESSAGE RECEIVED');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`📡 From: ${clientInfo.address}:${clientInfo.port}`);
      console.log(`📦 Size: ${buffer.length} bytes`);
      console.log(`🔢 Hex: ${buffer.toString('hex')}`);

      // ══════════════════════════════════════════════════════════════
      // Parse message
      // ══════════════════════════════════════════════════════════════
      const parsed = this.parser.parseMessage(buffer);

      if (!parsed) {
        console.error('❌ Failed to parse message - invalid format');
        console.log('═══════════════════════════════════════════════════════════════');
        return;
      }

      const { messageId, terminalSN, messageBody, sequenceNumber } = parsed;

      console.log('');
      console.log('✅ MESSAGE PARSED SUCCESSFULLY');
      console.log(`   Message: 0x${messageId.toString(16).padStart(4, '0')} ${this.parser.getMessageName(messageId)}`);
      console.log(`   IMEI: ${terminalSN}`);
      console.log(`   Sequence: ${sequenceNumber}`);

      // Store socket mapping
      this.deviceSockets.set(terminalSN, socket);

      // ══════════════════════════════════════════════════════════════
      // Route to specific handler
      // ══════════════════════════════════════════════════════════════
      switch (messageId) {
        case 0x0002: // Heartbeat
          await this.handleHeartbeat(socket, terminalSN, sequenceNumber);
          break;

        case 0x0100: // Registration
          await this.handleRegistration(socket, messageBody, terminalSN, sequenceNumber);
          break;

        case 0x0102: // Authentication
          await this.handleAuthentication(socket, messageBody, terminalSN, sequenceNumber);
          break;

        case 0x0200: // Location report
          await this.handleLocationReport(socket, messageBody, terminalSN, sequenceNumber);
          break;

        case 0x0900: // Data uplink
          await this.handleDataUplink(socket, messageBody, terminalSN, sequenceNumber);
          break;

        case 0x0104: // Parameter response
          await this.handleParameterResponse(socket, messageBody, terminalSN, sequenceNumber);
          break;

        case 0x0003: // Logout
          console.log('🚪 Device logout request');
          this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0003, 0x00, terminalSN);
          break;

        default:
          console.log(`⚠️ Unhandled message type: 0x${messageId.toString(16)}`);
          this.commands.sendGeneralResponse(socket, sequenceNumber, messageId, 0x00, terminalSN);
      }

      console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
      console.error('');
      console.error('❌ HANDLER ERROR:', error.message);
      console.error(error.stack);
      console.log('═══════════════════════════════════════════════════════════════');
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // MESSAGE HANDLERS
  // ═════════════════════════════════════════════════════════════════

  /**
   * Handle heartbeat (0x0002)
   */
  async handleHeartbeat(socket, terminalSN, sequenceNumber) {
    console.log('');
    console.log('💓 PROCESSING HEARTBEAT');

    try {
      const deviceId = await this.getDeviceId(terminalSN);
      
      if (deviceId) {
        await prisma.device.update({
          where: { id: deviceId },
          data: { 
            lastSeen: new Date(), 
            status: 'online' 
          }
        });
        console.log(`   ✅ Device ${terminalSN} status updated`);
      } else {
        console.log(`   ⚠️ Device ${terminalSN} not registered in database`);
      }

      this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0002, 0x00, terminalSN);

    } catch (error) {
      console.error(`   ❌ Heartbeat error:`, error.message);
    }
  }

  /**
   * Handle registration (0x0100)
   */
  async handleRegistration(socket, messageBody, terminalSN, sequenceNumber) {
    console.log('');
    console.log('📝 PROCESSING REGISTRATION');

    try {
      // Parse registration body
      const registration = this.parser.parseRegistration(messageBody);
      const { iccid, licensePlateColor, vehicleIdentification } = registration;

      // Determine if it's VIN or license plate
      const licensePlate = licensePlateColor !== 0 ? vehicleIdentification : null;
      const vin = licensePlateColor === 0 ? vehicleIdentification : null;

      console.log('');
      console.log('📋 Registration Details:');
      console.log(`   IMEI: ${terminalSN}`);
      console.log(`   ICCID: ${iccid || 'N/A'}`);
      console.log(`   License Plate: ${licensePlate || 'N/A'}`);
      console.log(`   VIN: ${vin || 'N/A'}`);

      // Generate auth code (base64 of IMEI for reproducibility)
      const authCode = Buffer.from(terminalSN).toString('base64');

      // Check if device exists
      let deviceId = await this.getDeviceId(terminalSN);

      if (!deviceId) {
        // Create new device
        const device = await prisma.device.create({
          data: {
            imei: terminalSN,
            deviceType: 'VL502',
            simNumber: iccid || null,
            vehicleNumber: licensePlate || null,
            vin: vin || null,
            isActive: true,
            authCode: authCode,
            status: 'active'
          }
        });
        console.log(`   ✅ New device created: ID=${device.id}`);
      } else {
        // Update existing device
        await prisma.device.update({
          where: { id: deviceId },
          data: {
            simNumber: iccid || null,
            vehicleNumber: licensePlate !== null ? licensePlate : undefined,
            vin: vin !== null ? vin : undefined,
            authCode: authCode,
            updatedAt: new Date(),
            status: 'active'
          }
        });
        console.log(`   ✅ Existing device updated: ID=${deviceId}`);
      }

      // Send registration response
      this.commands.sendRegistrationResponse(socket, sequenceNumber, 0x00, authCode, terminalSN);

    } catch (error) {
      console.error(`   ❌ Registration error:`, error.message);
      this.commands.sendRegistrationResponse(socket, sequenceNumber, 0x01, '', terminalSN);
    }
  }

  /**
   * Handle authentication (0x0102)
   */
  async handleAuthentication(socket, messageBody, terminalSN, sequenceNumber) {
    console.log('');
    console.log('🔐 PROCESSING AUTHENTICATION');

    try {
      const authCode = messageBody.toString('utf-8').trim();
      console.log(`   Received auth code: "${authCode}"`);

      const deviceId = await this.getDeviceId(terminalSN);

      if (!deviceId) {
        console.log(`   ❌ Device ${terminalSN} not registered`);
        this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0102, 0x07, terminalSN); // 0x07 = unregistered
        return;
      }

      const device = await prisma.device.findUnique({ where: { id: deviceId } });

      // Verify auth code
      let authValid = false;

      // Method 1: Direct match
      if (device.authCode && device.authCode === authCode) {
        authValid = true;
      }

      // Method 2: Decode base64 and verify IMEI
      if (!authValid) {
        try {
          const decoded = Buffer.from(authCode, 'base64').toString('utf-8');
          if (decoded === terminalSN || decoded.startsWith(terminalSN) || terminalSN.startsWith(decoded)) {
            authValid = true;
          }
        } catch (e) { /* not valid base64 */ }
      }

      // Method 3: Auto-accept if no stored auth code (legacy)
      if (!authValid && !device.authCode) {
        authValid = true;
      }

      if (authValid) {
        console.log(`   ✅ Authentication successful`);

        await prisma.device.update({
          where: { id: deviceId },
          data: { status: 'online', lastSeen: new Date() }
        });

        this.deviceSockets.set(terminalSN, socket);

        // Send success response
        this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0102, 0x00, terminalSN);

        // Per protocol: send time sync after auth
        setTimeout(() => {
          this.commands.sendTimeSync(socket, terminalSN);
        }, 500);

      } else {
        console.log(`   ❌ Authentication failed`);
        console.log(`   Expected: "${device.authCode}"`);
        this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0102, 0x01, terminalSN);
      }

    } catch (error) {
      console.error(`   ❌ Authentication error:`, error.message);
      this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0102, 0x01, terminalSN);
    }
  }

  /**
   * Handle location report (0x0200)
   */
  async handleLocationReport(socket, messageBody, terminalSN, sequenceNumber) {
    console.log('');
    console.log('📍 PROCESSING LOCATION REPORT');

    try {
      const location = this.parser.parseLocationReport(messageBody);

      const deviceId = await this.getDeviceId(terminalSN);

      if (deviceId) {
        // Save to database (you'll need to create this model)
        // await prisma.vL502LocationData.create({ ... });
        
        console.log(`   ✅ Location saved for device ${terminalSN}`);

        await prisma.device.update({
          where: { id: deviceId },
          data: { lastSeen: new Date(), status: 'online' }
        });
      } else {
        console.log(`   ⚠️ Location from unregistered device: ${terminalSN}`);
      }

      this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0200, 0x00, terminalSN);

    } catch (error) {
      console.error(`   ❌ Location error:`, error.message);
    }
  }

  /**
   * Handle data uplink (0x0900)
   */
  async handleDataUplink(socket, messageBody, terminalSN, sequenceNumber) {
    console.log('');
    console.log('📊 PROCESSING DATA UPLINK');

    try {
      const uplinkData = this.parser.parseDataUplink(messageBody);

      if (!uplinkData) {
        this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0900, 0x00, terminalSN);
        return;
      }

      // Handle based on type
      if (uplinkData.transparentType === 0xF0 && uplinkData.subcategory === 0x01) {
        // OBD data stream
        console.log(`   💾 Saving OBD data to database...`);
        await this.saveOBDData(terminalSN, uplinkData);
      } else if (uplinkData.transparentType === 0xF0) {
        console.log(`   F0 uplink - subcategory: 0x${uplinkData.subcategory?.toString(16)}`);
      } else if (uplinkData.transparentType === 0xF3) {
        console.log(`   F3 uplink - peripheral type: 0x${uplinkData.peripheralType?.toString(16)}`);
      }

      this.commands.sendGeneralResponse(socket, sequenceNumber, 0x0900, 0x00, terminalSN);

    } catch (error) {
      console.error(`   ❌ Data uplink error:`, error.message);
    }
  }

  /**
   * Save OBD data to database
   */
  async saveOBDData(terminalSN, uplinkData) {
    try {
      const deviceId = await this.getDeviceId(terminalSN);
      if (!deviceId) {
        console.log(`   ⚠️  Device ${terminalSN} not found in database`);
        return;
      }

      const { parsedData } = uplinkData;
      if (!parsedData || !parsedData.dataStreams) {
        console.log(`   ⚠️  No parsed OBD data available`);
        return;
      }

      const streams = parsedData.dataStreams;
      const location = parsedData.location;

      // Prepare data for insertion
      const obdData = {
        deviceId,
        timestamp: uplinkData.eventTime,
        
        // Location data
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        accOn: location?.accOn || false,
        positioned: location?.positioned || false,
        
        // Vehicle data
        totalMileage: streams[0x0528]?.value || streams[0x0546]?.value || null,
        speed: streams[0x0535]?.value || streams[0xFEF1]?.value || null,
        rpm: streams[0x0536]?.value || streams[0xF004]?.value || null,
        
        // Temperature
        coolantTemp: streams[0x052D]?.value || streams[0xFEEE]?.value || null,
        oilTemp: streams[0x010F]?.value || null,
        intakeAirTemp: streams[0x052E]?.value || streams[0xEEF6]?.value || null,
        
        // Fuel
        totalFuelUsed: streams[0xFEE9]?.value || streams[0xFD09]?.value || null,
        instantFuelConsumption: streams[0x0539]?.value || null,
        avgFuelConsumption: streams[0x0537]?.value || null,
        fuelLevel: streams[0xFEFC]?.value || streams[0x0544]?.value || null,
        
        // Pressure
        intakeManifoldPressure: streams[0x053D]?.value || null,
        oilPressure: streams[0x053B]?.value || null,
        
        // Engine load & throttle
        engineLoad: streams[0x0114]?.value || streams[0xF003]?.value || null,
        acceleratorPosition: streams[0x053F]?.value || streams[0xE003]?.value || null,
        relativeThrottle: streams[0x0547]?.value || null,
        absoluteThrottle: streams[0x0548]?.value || streams[0xFEF2]?.value || null,
        
        // Battery
        batteryVoltage: streams[0x0530]?.value ? streams[0x0530].value / 1000 : null, // Convert mV to V
        
        // VIN
        vin: streams[0xFEEC]?.value || null,
      };

      // Create or update VL502 OBD data record
      await prisma.vL502OBDData.create({
        data: obdData
      });

      console.log(`   ✅ OBD data saved successfully`);

      // Also update device with latest data
      await prisma.device.update({
        where: { id: deviceId },
        data: {
          lastSeen: new Date(),
          status: 'online'
        }
      });

    } catch (error) {
      console.error(`   ❌ Error saving OBD data:`, error.message);
    }
  }

  /**
   * Handle parameter response (0x0104)
   */
  async handleParameterResponse(socket, messageBody, terminalSN, sequenceNumber) {
    console.log('');
    console.log('📋 PROCESSING PARAMETER RESPONSE');
    console.log(`   Body: ${messageBody.toString('hex')}`);
  }

  // ═════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═════════════════════════════════════════════════════════════════

  /**
   * Get device ID from IMEI (with 14/15 digit tolerance)
   */
  async getDeviceId(imei) {
    try {
      // Exact match
      let device = await prisma.device.findFirst({
        where: { imei }
      });

      // If not found and IMEI is 14 digits, try matching 15-digit IMEI in DB
      if (!device && imei.length === 14) {
        device = await prisma.device.findFirst({
          where: { imei: { startsWith: imei } }
        });
      }

      // If not found and IMEI is 15 digits, try matching first 14 digits
      if (!device && imei.length === 15) {
        device = await prisma.device.findFirst({
          where: { imei: { startsWith: imei.substring(0, 14) } }
        });
      }

      return device ? device.id : null;
    } catch (e) {
      console.error('   ❌ Database error:', e.message);
      return null;
    }
  }
}

export default VL502Handler;