import VL502Data from '../../model/VL502Data.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * VL502 Device Controller
 * Handles HTTP requests for VL502 devices
 */
class VL502Controller {

  // ═══════════════════════════════════════════════════════════════════════════
  // 📍 LOCATION ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/location/:imei/latest
   * Get latest location for device
   */
  static async getLatestLocation(req, res) {
    try {
      const { imei } = req.params;

      const location = await VL502Data.getLatestLocation(imei);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'No location data found for this device'
        });
      }

      res.json({
        success: true,
        data: location
      });

    } catch (error) {
      console.error('❌ Error getting latest location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get location',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vl502/location/:imei/history
   * Get location history
   */
  static async getLocationHistory(req, res) {
    try {
      const { imei } = req.params;
      const { startTime, endTime, limit } = req.query;

      const locations = await VL502Data.getLocationHistory(
        imei,
        startTime,
        endTime,
        parseInt(limit) || 1000
      );

      res.json({
        success: true,
        count: locations.length,
        data: locations
      });

    } catch (error) {
      console.error('❌ Error getting location history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get location history',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vl502/location/:imei/live
   * Get live tracking data (location + status)
   */
  static async getLiveTracking(req, res) {
    try {
      const { imei } = req.params;

      const [location, obd] = await Promise.all([
        VL502Data.getLatestLocation(imei),
        VL502Data.getLatestOBD(imei)
      ]);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Device not found or no data available'
        });
      }

      // Calculate vehicle status
      let vehicleStatus = 'Unknown';
      if (location) {
          if (!location.accOn) vehicleStatus = 'Parked';
          else if (location.speed > 5) vehicleStatus = 'Moving';
          else vehicleStatus = 'Idle';
      }

      // Flatten structure to match frontend expectations
      res.json({
        success: true,
        data: {
          ...location, // Flatten location fields (latitude, longitude, speed, etc.)
       deviceName: location.device?.deviceName || 'Unknown Device',
          deviceModel: 'VL502',
          status: location.device?.status === 'online' ? 'online' : 'offline',
          vehicleStatus,// Simplified status
          vehicleStatus,
          obd: obd ? {
            speed: obd.vehicleSpeed,
            rpm: obd.engineRpm,
            fuelLevel: obd.fuelLevel,
            coolantTemp: obd.coolantTemp,
            engineLoad: obd.engineLoad,
            batteryVoltage: obd.batteryVoltage,
            intakePressure: obd.intakePressure,
            accumulatedMileage: obd.totalMileage || obd.vehicleMileage, // Prefer totalMileage if available
            intakeAirTemp: obd.intakeAirTemp,
            throttlePosition: obd.throttlePosition
          } : null
        }
      });

    } catch (error) {
      console.error('❌ Error getting live tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get live tracking data',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔧 OBD DATA ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/obd/:imei/latest
   * Get latest OBD data
   */
  static async getLatestOBD(req, res) {
    try {
      const { imei } = req.params;

      const obd = await VL502Data.getLatestOBD(imei);

      if (!obd) {
        return res.status(404).json({
          success: false,
          message: 'No OBD data found for this device'
        });
      }

      res.json({
        success: true,
        data: obd
      });

    } catch (error) {
      console.error('❌ Error getting latest OBD:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get OBD data',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vl502/obd/:imei/history
   * Get OBD history
   */
  static async getOBDHistory(req, res) {
    try {
      const { imei } = req.params;
      const { startTime, endTime, limit } = req.query;

      const obdData = await VL502Data.getOBDHistory(
        imei,
        startTime,
        endTime,
        parseInt(limit) || 100
      );

      res.json({
        success: true,
        count: obdData.length,
        data: obdData
      });

    } catch (error) {
      console.error('❌ Error getting OBD history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get OBD history',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ ALARM ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/alarms/:imei/active
   * Get active alarms
   */
  static async getActiveAlarms(req, res) {
    try {
      const { imei } = req.params;

      const alarms = await VL502Data.getActiveAlarms(imei);

      res.json({
        success: true,
        count: alarms.length,
        data: alarms
      });

    } catch (error) {
      console.error('❌ Error getting active alarms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active alarms',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vl502/alarms/:imei/history
   * Get alarm history
   */
  static async getAlarmHistory(req, res) {
    try {
      const { imei } = req.params;
      const { category, severity, startTime, endTime, limit } = req.query;

      const alarms = await VL502Data.getAlarmHistory(imei, {
        category,
        severity,
        startTime,
        endTime,
        limit: parseInt(limit) || 100
      });

      res.json({
        success: true,
        count: alarms.length,
        data: alarms
      });

    } catch (error) {
      console.error('❌ Error getting alarm history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get alarm history',
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/vl502/alarms/:alarmId/acknowledge
   * Acknowledge alarm
   */
  static async acknowledgeAlarm(req, res) {
    try {
      const { alarmId } = req.params;

      const alarm = await VL502Data.acknowledgeAlarm(parseInt(alarmId));

      res.json({
        success: true,
        message: 'Alarm acknowledged',
        data: alarm
      });

    } catch (error) {
      console.error('❌ Error acknowledging alarm:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to acknowledge alarm',
        error: error.message
      });
    }
  }

  /**
   * PATCH /api/vl502/alarms/:alarmId/resolve
   * Resolve alarm
   */
  static async resolveAlarm(req, res) {
    try {
      const { alarmId } = req.params;

      const alarm = await VL502Data.resolveAlarm(parseInt(alarmId));

      res.json({
        success: true,
        message: 'Alarm resolved',
        data: alarm
      });

    } catch (error) {
      console.error('❌ Error resolving alarm:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resolve alarm',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚗 TRIP ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/trips/:imei/current
   * Get current active trip
   */
  static async getCurrentTrip(req, res) {
    try {
      const { imei } = req.params;

      const trip = await VL502Data.getCurrentTrip(imei);

      if (!trip) {
        return res.json({
          success: true,
          message: 'No active trip',
          data: null
        });
      }

      res.json({
        success: true,
        data: trip
      });

    } catch (error) {
      console.error('❌ Error getting current trip:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get current trip',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vl502/trips/:imei/history
   * Get trip history
   */
  static async getTripHistory(req, res) {
    try {
      const { imei } = req.params;
      const { limit } = req.query;

      const trips = await VL502Data.getTripHistory(
        imei,
        parseInt(limit) || 50
      );

      res.json({
        success: true,
        count: trips.length,
        data: trips
      });

    } catch (error) {
      console.error('❌ Error getting trip history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get trip history',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔧 DTC (TROUBLE CODES) ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/dtc/:imei/active
   * Get active DTCs
   */
  static async getActiveDTCs(req, res) {
    try {
      const { imei } = req.params;

      const dtcs = await VL502Data.getActiveDTCs(imei);

      res.json({
        success: true,
        count: dtcs.length,
        data: dtcs
      });

    } catch (error) {
      console.error('❌ Error getting active DTCs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active DTCs',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/vl502/dtc/:dtcId
   * Clear specific DTC
   */
  static async clearDTC(req, res) {
    try {
      const { dtcId } = req.params;

      const dtc = await VL502Data.clearDTC(parseInt(dtcId));

      res.json({
        success: true,
        message: 'DTC cleared',
        data: dtc
      });

    } catch (error) {
      console.error('❌ Error clearing DTC:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear DTC',
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/vl502/dtc/:imei/all
   * Clear all DTCs for device
   */
  static async clearAllDTCs(req, res) {
    try {
      const { imei } = req.params;

      const result = await VL502Data.clearAllDTCs(imei);

      res.json({
        success: true,
        message: `Cleared ${result.count} DTCs`,
        data: result
      });

    } catch (error) {
      console.error('❌ Error clearing all DTCs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear DTCs',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎬 EMERGENCY EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/emergency/:imei
   * Get emergency events
   */
  static async getEmergencyEvents(req, res) {
    try {
      const { imei } = req.params;
      const { limit } = req.query;

      const events = await VL502Data.getEmergencyEvents(
        imei,
        parseInt(limit) || 20
      );

      res.json({
        success: true,
        count: events.length,
        data: events
      });

    } catch (error) {
      console.error('❌ Error getting emergency events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get emergency events',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚗 VEHICLE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/vehicle-status/:imei
   * Get latest vehicle status (doors, windows, lights)
   */
  static async getVehicleStatus(req, res) {
    try {
      const { imei } = req.params;

      const status = await VL502Data.getLatestVehicleStatus(imei);

      if (!status) {
        return res.status(404).json({
          success: false,
          message: 'No vehicle status data found'
        });
      }

      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('❌ Error getting vehicle status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get vehicle status',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/parameters/:imei
   * Get all device parameters
   */
  static async getParameters(req, res) {
    try {
      const { imei } = req.params;

      const parameters = await VL502Data.getParameters(imei);

      res.json({
        success: true,
        count: parameters.length,
        data: parameters
      });

    } catch (error) {
      console.error('❌ Error getting parameters:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get parameters',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎛️ DEVICE COMMANDS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/vl502/commands/:imei/set-parameter
   * Send set parameter command (0x8103)
   */
  static async setParameter(req, res) {
    try {
      const { imei } = req.params;
      const { parameterId, value } = req.body;

      if (!parameterId || value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: parameterId and value'
        });
      }

      const vl502Handler = global.vl502Handler;
      if (!vl502Handler) {
        return res.status(503).json({
          success: false,
          message: 'VL502 handler not initialized'
        });
      }

      // Get device
      const device = await prisma.device.findUnique({
        where: { imei }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Create command buffer (implementation needed in vl502Commands.js)
      const commandBuffer = vl502Handler.commands.createSetParameterCommand(
        imei,
        parameterId,
        value
      );

      // Send command
      const sent = await vl502Handler.sendCommand(imei, commandBuffer);

      if (!sent) {
        return res.status(503).json({
          success: false,
          message: 'Device not connected'
        });
      }

      // Log command
      await VL502Data.logCommand({
        imei,
        deviceId: device.id,
        commandId: '0x8103',
        commandName: 'Set Parameter',
        commandData: JSON.stringify({ parameterId, value }),
        status: 'sent'
      });

      res.json({
        success: true,
        message: 'Command sent to device'
      });

    } catch (error) {
      console.error('❌ Error sending set parameter command:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send command',
        error: error.message
      });
    }
  }

  /**
   * POST /api/vl502/commands/:imei/control
   * Send control command (0x8105)
   */
  static async controlDevice(req, res) {
    try {
      const { imei } = req.params;
      const { command } = req.body;

      // Command codes:
      // 3: Terminal Off
      // 4: Terminal Reset
      // 5: Factory Reset
      // 0xA1: OBD MCU firmware upgrade via WiFi
      // 0xB1: Read OBD MCU log

      const validCommands = [3, 4, 5, 0xA1, 0xA2, 0xB1, 0xB2];
      if (!validCommands.includes(command)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid command code'
        });
      }

      const vl502Handler = global.vl502Handler;
      if (!vl502Handler) {
        return res.status(503).json({
          success: false,
          message: 'VL502 handler not initialized'
        });
      }

      const device = await prisma.device.findUnique({
        where: { imei }
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Create command buffer
      const commandBuffer = vl502Handler.commands.createControlCommand(
        imei,
        command
      );

      const sent = await vl502Handler.sendCommand(imei, commandBuffer);

      if (!sent) {
        return res.status(503).json({
          success: false,
          message: 'Device not connected'
        });
      }

      await VL502Data.logCommand({
        imei,
        deviceId: device.id,
        commandId: '0x8105',
        commandName: 'Device Control',
        commandData: JSON.stringify({ command }),
        status: 'sent'
      });

      res.json({
        success: true,
        message: 'Control command sent'
      });

    } catch (error) {
      console.error('❌ Error sending control command:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send control command',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vl502/commands/:imei/history
   * Get command history
   */
  static async getCommandHistory(req, res) {
    try {
      const { imei } = req.params;
      const { limit } = req.query;

      const commands = await VL502Data.getCommandHistory(
        imei,
        parseInt(limit) || 50
      );

      res.json({
        success: true,
        count: commands.length,
        data: commands
      });

    } catch (error) {
      console.error('❌ Error getting command history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get command history',
        error: error.message
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 STATISTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/vl502/stats/:imei
   * Get device statistics
   */
  static async getDeviceStats(req, res) {
    try {
      const { imei } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await VL502Data.getDeviceStats(imei, startDate, endDate);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('❌ Error getting device stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get device statistics',
        error: error.message
      });
    }
  }

  /**
   * GET /api/vl502/dashboard/:imei
   * Get complete dashboard data
   */
  static async getDashboard(req, res) {
    try {
      const { imei } = req.params;

      const [
        location,
        obd,
        vehicleStatus,
        activeAlarms,
        activeDTCs,
        currentTrip,
        stats
      ] = await Promise.all([
        VL502Data.getLatestLocation(imei),
        VL502Data.getLatestOBD(imei),
        VL502Data.getLatestVehicleStatus(imei),
        VL502Data.getActiveAlarms(imei),
        VL502Data.getActiveDTCs(imei),
        VL502Data.getCurrentTrip(imei),
        VL502Data.getDeviceStats(imei)
      ]);

      res.json({
        success: true,
        data: {
          location,
          obd,
          vehicleStatus,
          alarms: {
            active: activeAlarms,
            count: activeAlarms.length
          },
          dtcs: {
            active: activeDTCs,
            count: activeDTCs.length
          },
          currentTrip,
          statistics: stats
        }
      });

    } catch (error) {
      console.error('❌ Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard data',
        error: error.message
      });
    }
  }
}

export default VL502Controller;