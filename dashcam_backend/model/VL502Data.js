import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * VL502 Data Model - Handles all VL502 device data operations
 */
class VL502Data {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 📍 LOCATION DATA (0x0200)
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Save VL502 location data
   */
  static async saveLocation(locationData) {
    try {
      const {
        imei,
        deviceId,
        latitude,
        longitude,
        altitude,
        speed,
        direction,
        accOn,
        positioned,
        southLatitude,
        westLongitude,
        inOperation,
        doorLocked,
        door1Open,
        door2Open,
        door3Open,
        door4Open,
        door5Open,
        oilCircuitOk,
        electricCircuitOk,
        loadStatus,
        positioningType,
        gpsSatellites,
        bdSatellites,
        glonassSatellites,
        galileoSatellites,
        satelliteCount,
        signalStrength,
        gpsMileage,
        ioStatus,
        baseStationData,
        alarmFlag,
        timestamp,
        address
      } = locationData;

      const location = await prisma.vL502Location.create({
        data: {
          deviceId,
          imei,
          latitude,
          longitude,
          altitude,
          speed,
          direction,
          accOn: accOn ?? false,
          positioned: positioned ?? true,
          southLatitude: southLatitude ?? false,
          westLongitude: westLongitude ?? false,
          inOperation: inOperation ?? true,
          doorLocked,
          door1Open,
          door2Open,
          door3Open,
          door4Open,
          door5Open,
          oilCircuitOk,
          electricCircuitOk,
          loadStatus,
          positioningType,
          gpsSatellites: gpsSatellites ?? false,
          bdSatellites: bdSatellites ?? false,
          glonassSatellites: glonassSatellites ?? false,
          galileoSatellites: galileoSatellites ?? false,
          satelliteCount,
          signalStrength,
          gpsMileage,
          ioStatus: ioStatus ? JSON.stringify(ioStatus) : null,
          baseStationData: baseStationData ? JSON.stringify(baseStationData) : null,
          alarmFlag,
          timestamp: timestamp || new Date(),
          address
        }
      });

      console.log(`✅ VL502 Location saved: ${imei} at ${timestamp}`);
      return location;

    } catch (error) {
      console.error('❌ Error saving VL502 location:', error);
      throw error;
    }
  }

  /**
   * Get latest location for device
   */
  static async getLatestLocation(imei) {
    try {
      return await prisma.vL502Location.findFirst({
        where: { imei },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error getting latest location:', error);
      throw error;
    }
  }

  /**
   * Get location history
   */
  static async getLocationHistory(imei, startTime, endTime, limit = 1000) {
    try {
      const where = { imei };
      
      if (startTime || endTime) {
        where.timestamp = {};
        if (startTime) where.timestamp.gte = new Date(startTime);
        if (endTime) where.timestamp.lte = new Date(endTime);
      }

      return await prisma.vL502Location.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('❌ Error getting location history:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔧 OBD DATA (0x0900 - subcategory 0x01)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save OBD data
   */
  static async saveOBDData(obdData) {
    try {
      const {
        imei,
        deviceId,
        eventTime,
        dataType,
        vehicleType,
        engineRpm,
        engineLoad,
        engineTorque,
        engineTorquePercent,
        engineRunTime,
        timeSinceStart,
        coolantTemp,
        oilTemp,
        fuelTemp,
        intakeAirTemp,
        ambientTemp,
        oilPressure,
        intakePressure,
        barometricPressure,
        fuelLevel,
        fuelVolume,
        fuelConsumption,
        instantFuelRate,
        avgFuelEconomy,
        instantFuelEconomy,
        totalFuelUsed,
        vehicleMileage,
        tripMileage,
        totalMileage,
        vehicleSpeed,
        throttlePosition,
        acceleratorPosition,
        intakeAirFlow,
        mafRate,
        batteryVoltage,
        gearPosition,
        clutchStatus,
        latitude,
        longitude
      } = obdData;

      const obd = await prisma.vL502OBDData.create({
        data: {
          deviceId,
          imei,
          eventTime: eventTime || new Date(),
          dataType: dataType ?? 0,
          vehicleType: vehicleType ?? 1,
          engineRpm,
          engineLoad,
          engineTorque,
          engineTorquePercent,
          engineRunTime,
          timeSinceStart,
          coolantTemp,
          oilTemp,
          fuelTemp,
          intakeAirTemp,
          ambientTemp,
          oilPressure,
          intakePressure,
          barometricPressure,
          fuelLevel,
          fuelVolume,
          fuelConsumption,
          instantFuelRate,
          avgFuelEconomy,
          instantFuelEconomy,
          totalFuelUsed,
          vehicleMileage,
          tripMileage,
          totalMileage,
          vehicleSpeed,
          throttlePosition,
          acceleratorPosition,
          intakeAirFlow,
          mafRate,
          batteryVoltage,
          gearPosition,
          clutchStatus,
          latitude,
          longitude
        }
      });

      console.log(`✅ VL502 OBD data saved: ${imei} at ${eventTime}`);
      return obd;

    } catch (error) {
      console.error('❌ Error saving OBD data:', error);
      throw error;
    }
  }

  /**
   * Get latest OBD data
   */
  static async getLatestOBD(imei) {
    try {
      return await prisma.vL502OBDData.findFirst({
        where: { imei },
        orderBy: { eventTime: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error getting latest OBD:', error);
      throw error;
    }
  }

  /**
   * Get OBD history
   */
  static async getOBDHistory(imei, startTime, endTime, limit = 100) {
    try {
      const where = { imei };
      
      if (startTime || endTime) {
        where.eventTime = {};
        if (startTime) where.eventTime.gte = new Date(startTime);
        if (endTime) where.eventTime.lte = new Date(endTime);
      }

      return await prisma.vL502OBDData.findMany({
        where,
        orderBy: { eventTime: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('❌ Error getting OBD history:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚠️ ALARMS (0x0900 - subcategory 0x03)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save alarm
   */
  static async saveAlarm(alarmData) {
    try {
      const {
        imei,
        deviceId,
        alarmId,
        alarmName,
        alarmCategory,
        severity,
        description,
        detailDescription,
        latitude,
        longitude,
        eventTime
      } = alarmData;

      const alarm = await prisma.vL502Alarm.create({
        data: {
          deviceId,
          imei,
          alarmId,
          alarmName,
          alarmCategory: alarmCategory || 'unknown',
          severity: severity || 'medium',
          description,
          detailDescription,
          latitude,
          longitude,
          eventTime: eventTime || new Date(),
          isActive: true
        }
      });

      console.log(`⚠️ VL502 Alarm saved: ${alarmName} (${imei})`);
      return alarm;

    } catch (error) {
      console.error('❌ Error saving alarm:', error);
      throw error;
    }
  }

  /**
   * Get active alarms
   */
  static async getActiveAlarms(imei) {
    try {
      return await prisma.vL502Alarm.findMany({
        where: {
          imei,
          isActive: true
        },
        orderBy: { eventTime: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error getting active alarms:', error);
      throw error;
    }
  }

  /**
   * Get alarm history
   */
  static async getAlarmHistory(imei, filters = {}) {
    try {
      const where = { imei };

      if (filters.category) where.alarmCategory = filters.category;
      if (filters.severity) where.severity = filters.severity;
      if (filters.startTime || filters.endTime) {
        where.eventTime = {};
        if (filters.startTime) where.eventTime.gte = new Date(filters.startTime);
        if (filters.endTime) where.eventTime.lte = new Date(filters.endTime);
      }

      return await prisma.vL502Alarm.findMany({
        where,
        orderBy: { eventTime: 'desc' },
        take: filters.limit || 100
      });
    } catch (error) {
      console.error('❌ Error getting alarm history:', error);
      throw error;
    }
  }

  /**
   * Acknowledge alarm
   */
  static async acknowledgeAlarm(alarmId) {
    try {
      return await prisma.vL502Alarm.update({
        where: { id: alarmId },
        data: {
          acknowledgedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Error acknowledging alarm:', error);
      throw error;
    }
  }

  /**
   * Resolve alarm
   */
  static async resolveAlarm(alarmId) {
    try {
      return await prisma.vL502Alarm.update({
        where: { id: alarmId },
        data: {
          isActive: false,
          resolvedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Error resolving alarm:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚗 TRIP DATA (0x0900 - subcategory 0x04)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start new trip
   */
  static async startTrip(tripData) {
    try {
      const {
        imei,
        deviceId,
        tripNumber,
        startTime,
        startLatitude,
        startLongitude
      } = tripData;

      const trip = await prisma.vL502Trip.create({
        data: {
          deviceId,
          imei,
          tripNumber,
          tripProperty: 1, // Start
          startTime: startTime || new Date(),
          startLatitude,
          startLongitude
        }
      });

      console.log(`🚗 VL502 Trip started: #${tripNumber} (${imei})`);
      return trip;

    } catch (error) {
      console.error('❌ Error starting trip:', error);
      throw error;
    }
  }

  /**
   * End trip
   */
  static async endTrip(tripData) {
    try {
      const {
        imei,
        tripNumber,
        endTime,
        endLatitude,
        endLongitude,
        distance,
        fuelConsumed,
        idlingCount,
        idlingTime
      } = tripData;

      // Find the trip
      const trip = await prisma.vL502Trip.findFirst({
        where: {
          imei,
          tripNumber,
          tripProperty: 1 // Start
        },
        orderBy: { startTime: 'desc' }
      });

      if (!trip) {
        throw new Error(`Trip #${tripNumber} not found for ${imei}`);
      }

      // Calculate duration
      const duration = Math.floor((new Date(endTime) - new Date(trip.startTime)) / 1000);

      // Update trip
      const updatedTrip = await prisma.vL502Trip.update({
        where: { id: trip.id },
        data: {
          tripProperty: 2, // End
          endTime: endTime || new Date(),
          endLatitude,
          endLongitude,
          distance,
          fuelConsumed,
          idlingCount,
          idlingTime,
          duration
        }
      });

      console.log(`🏁 VL502 Trip ended: #${tripNumber} (${imei}) - ${distance}km`);
      return updatedTrip;

    } catch (error) {
      console.error('❌ Error ending trip:', error);
      throw error;
    }
  }

  /**
   * Get trip history
   */
  static async getTripHistory(imei, limit = 50) {
    try {
      return await prisma.vL502Trip.findMany({
        where: {
          imei,
          tripProperty: 2 // Only completed trips
        },
        orderBy: { startTime: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('❌ Error getting trip history:', error);
      throw error;
    }
  }

  /**
   * Get current active trip
   */
  static async getCurrentTrip(imei) {
    try {
      return await prisma.vL502Trip.findFirst({
        where: {
          imei,
          tripProperty: 1, // Start
          endTime: null
        },
        orderBy: { startTime: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error getting current trip:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔧 TROUBLE CODES (DTCs) - (0x0900 - subcategory 0x02)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save trouble code
   */
  static async saveTroubleCode(dtcData) {
    try {
      const {
        imei,
        deviceId,
        systemId,
        systemName,
        dtcCode,
        dtcDescription,
        isCurrent,
        latitude,
        longitude,
        firstDetected
      } = dtcData;

      // Check if DTC already exists
      const existing = await prisma.vL502TroubleCode.findFirst({
        where: {
          imei,
          dtcCode,
          isCurrent: true
        }
      });

      if (existing) {
        // Update occurrence count
        return await prisma.vL502TroubleCode.update({
          where: { id: existing.id },
          data: {
            occurrenceCount: existing.occurrenceCount + 1,
            lastDetected: new Date()
          }
        });
      }

      // Create new DTC
      const dtc = await prisma.vL502TroubleCode.create({
        data: {
          deviceId,
          imei,
          systemId,
          systemName,
          dtcCode,
          dtcDescription,
          isCurrent: isCurrent ?? true,
          occurrenceCount: 1,
          latitude,
          longitude,
          firstDetected: firstDetected || new Date(),
          lastDetected: new Date()
        }
      });

      console.log(`🔧 VL502 DTC saved: ${dtcCode} (${imei})`);
      return dtc;

    } catch (error) {
      console.error('❌ Error saving DTC:', error);
      throw error;
    }
  }

  /**
   * Get active DTCs
   */
  static async getActiveDTCs(imei) {
    try {
      return await prisma.vL502TroubleCode.findMany({
        where: {
          imei,
          isCurrent: true,
          clearedAt: null
        },
        orderBy: { lastDetected: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error getting active DTCs:', error);
      throw error;
    }
  }

  /**
   * Clear DTC
   */
  static async clearDTC(dtcId) {
    try {
      return await prisma.vL502TroubleCode.update({
        where: { id: dtcId },
        data: {
          isCurrent: false,
          clearedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Error clearing DTC:', error);
      throw error;
    }
  }

  /**
   * Clear all DTCs for device
   */
  static async clearAllDTCs(imei) {
    try {
      return await prisma.vL502TroubleCode.updateMany({
        where: {
          imei,
          isCurrent: true
        },
        data: {
          isCurrent: false,
          clearedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Error clearing all DTCs:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎬 EMERGENCY EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save emergency event
   */
  static async saveEmergencyEvent(eventData) {
    try {
      const {
        imei,
        deviceId,
        eventId,
        eventType,
        eventName,
        peakAcceleration,
        systemTime,
        accelerationData,
        gpsData,
        canData,
        fileName,
        collisionAngle,
        collisionType,
        collisionFactor
      } = eventData;

      const event = await prisma.vL502EmergencyEvent.create({
        data: {
          deviceId,
          imei,
          eventId,
          eventType,
          eventName,
          peakAcceleration,
          systemTime: systemTime || new Date(),
          accelerationData: JSON.stringify(accelerationData),
          gpsData: JSON.stringify(gpsData),
          canData: canData ? JSON.stringify(canData) : null,
          fileName,
          collisionAngle,
          collisionType,
          collisionFactor
        }
      });

      console.log(`🚨 VL502 Emergency event saved: ${eventName} (${imei})`);
      return event;

    } catch (error) {
      console.error('❌ Error saving emergency event:', error);
      throw error;
    }
  }

  /**
   * Get emergency events
   */
  static async getEmergencyEvents(imei, limit = 20) {
    try {
      return await prisma.vL502EmergencyEvent.findMany({
        where: { imei },
        orderBy: { systemTime: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('❌ Error getting emergency events:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚗 VEHICLE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save vehicle status
   */
  static async saveVehicleStatus(statusData) {
    try {
      const {
        imei,
        deviceId,
        driverDoor,
        passengerDoor,
        rearLeftDoor,
        rearRightDoor,
        trunk,
        allDoorsLocked,
        driverLock,
        passengerLock,
        driverWindow,
        passengerWindow,
        rearLeftWindow,
        rearRightWindow,
        sunroof,
        headlights,
        highBeam,
        lowBeam,
        fogLights,
        leftTurnSignal,
        rightTurnSignal,
        hazardLights,
        seatBeltDriver,
        seatBeltPassenger,
        airbagStatus,
        accOn,
        keyInserted,
        handbrake,
        footBrake,
        airConditioner,
        wiper
      } = statusData;

      return await prisma.vL502VehicleStatus.create({
        data: {
          deviceId,
          imei,
          driverDoor,
          passengerDoor,
          rearLeftDoor,
          rearRightDoor,
          trunk,
          allDoorsLocked,
          driverLock,
          passengerLock,
          driverWindow,
          passengerWindow,
          rearLeftWindow,
          rearRightWindow,
          sunroof,
          headlights,
          highBeam,
          lowBeam,
          fogLights,
          leftTurnSignal,
          rightTurnSignal,
          hazardLights,
          seatBeltDriver,
          seatBeltPassenger,
          airbagStatus,
          accOn,
          keyInserted,
          handbrake,
          footBrake,
          airConditioner,
          wiper
        }
      });
    } catch (error) {
      console.error('❌ Error saving vehicle status:', error);
      throw error;
    }
  }

  /**
   * Get latest vehicle status
   */
  static async getLatestVehicleStatus(imei) {
    try {
      return await prisma.vL502VehicleStatus.findFirst({
        where: { imei },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      console.error('❌ Error getting vehicle status:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 DEVICE PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save/Update parameter
   */
  static async saveParameter(paramData) {
    try {
      const {
        imei,
        deviceId,
        parameterId,
        parameterName,
        category,
        value,
        dataType
      } = paramData;

      return await prisma.vL502Parameter.upsert({
        where: {
          deviceId_parameterId: {
            deviceId,
            parameterId
          }
        },
        update: {
          value,
          lastUpdated: new Date()
        },
        create: {
          deviceId,
          imei,
          parameterId,
          parameterName,
          category,
          value,
          dataType
        }
      });
    } catch (error) {
      console.error('❌ Error saving parameter:', error);
      throw error;
    }
  }

  /**
   * Get all parameters
   */
  static async getParameters(imei) {
    try {
      return await prisma.vL502Parameter.findMany({
        where: { imei },
        orderBy: { parameterId: 'asc' }
      });
    } catch (error) {
      console.error('❌ Error getting parameters:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 COMMAND LOG
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Log command sent to device
   */
  static async logCommand(commandData) {
    try {
      const {
        imei,
        deviceId,
        commandId,
        commandName,
        commandData: cmdData,
        status
      } = commandData;

      return await prisma.vL502Command.create({
        data: {
          deviceId,
          imei,
          commandId,
          commandName,
          commandData: cmdData,
          status: status || 'pending'
        }
      });
    } catch (error) {
      console.error('❌ Error logging command:', error);
      throw error;
    }
  }

  /**
   * Update command status
   */
  static async updateCommandStatus(commandId, status, response = null) {
    try {
      return await prisma.vL502Command.update({
        where: { id: commandId },
        data: {
          status,
          response,
          acknowledgedAt: status === 'acked' ? new Date() : undefined
        }
      });
    } catch (error) {
      console.error('❌ Error updating command status:', error);
      throw error;
    }
  }

  /**
   * Get command history
   */
  static async getCommandHistory(imei, limit = 50) {
    try {
      return await prisma.vL502Command.findMany({
        where: { imei },
        orderBy: { sentAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('❌ Error getting command history:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📊 STATISTICS & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get device statistics
   */
  static async getDeviceStats(imei, startDate, endDate) {
    try {
      const where = { imei };
      if (startDate || endDate) {
        where.eventTime = {};
        if (startDate) where.eventTime.gte = new Date(startDate);
        if (endDate) where.eventTime.lte = new Date(endDate);
      }

      const [
        totalTrips,
        totalAlarms,
        activeDTCs,
        latestOBD
      ] = await Promise.all([
        prisma.vL502Trip.count({
          where: {
            imei,
            tripProperty: 2,
            ...(startDate && { startTime: { gte: new Date(startDate) } })
          }
        }),
        prisma.vL502Alarm.count({
          where: {
            imei,
            ...(startDate && { eventTime: { gte: new Date(startDate) } })
          }
        }),
        prisma.vL502TroubleCode.count({
          where: {
            imei,
            isCurrent: true,
            clearedAt: null
          }
        }),
        prisma.vL502OBDData.findFirst({
          where: { imei },
          orderBy: { eventTime: 'desc' }
        })
      ]);

      return {
        totalTrips,
        totalAlarms,
        activeDTCs,
        currentFuelLevel: latestOBD?.fuelLevel,
        currentMileage: latestOBD?.vehicleMileage,
        totalFuelUsed: latestOBD?.totalFuelUsed
      };
    } catch (error) {
      console.error('❌ Error getting device stats:', error);
      throw error;
    }
  }
}

export default VL502Data;