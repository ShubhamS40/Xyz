import prisma from '../config/database.js';

class DeviceModel {
  // Get all devices with latest location
  async getAllDevices() {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: 'desc' },
      include: {
        _count: {
          select: { logs: true, data: true }
        },
        data: {
          take: 1,
          orderBy: { receivedAt: 'desc' }
        }
      }
    });
    
    // If device has location in Device model, use it; otherwise use latest from DeviceData
    return devices.map(device => {
      if (!device.latitude && device.data && device.data.length > 0) {
        const latestData = device.data[0];
        return {
          ...device,
          latitude: latestData.latitude,
          longitude: latestData.longitude,
          speed: latestData.speed,
          accStatus: latestData.accStatus
        };
      }
      return device;
    });
  }

  // Get device by IMEI with latest location
  async getDeviceByIMEI(imei) {
    const device = await prisma.device.findUnique({
      where: { imei },
      include: {
        logs: {
          take: 10,
          orderBy: { timestamp: 'desc' }
        },
        data: {
          take: 1,
          orderBy: { receivedAt: 'desc' }
        }
      }
    });
    
    if (!device) return null;
    
    // Handle VL502 data
    if ((device.deviceModel === 'VL502' || device.vl502Locations?.length > 0) && device.vl502Locations && device.vl502Locations.length > 0) {
      const latestData = device.vl502Locations[0];
      return {
        ...device,
        latitude: latestData.latitude,
        longitude: latestData.longitude,
        speed: latestData.speed,
        accStatus: latestData.accOn ? 1 : 0,
        lastSeen: latestData.receivedAt,
        address: latestData.address,
        gnssType: 'GPS',
        satellites: latestData.satelliteCount || 0,
        signalStrength: latestData.signalStrength || 'Medium'
      };
    }

    // If device has location in Device model, use it; otherwise use latest from DeviceData
    if (!device.latitude && device.data && device.data.length > 0) {
      const latestData = device.data[0];
      return {
        ...device,
        latitude: latestData.latitude,
        longitude: latestData.longitude,
        speed: latestData.speed,
        accStatus: latestData.accStatus,
        gnssType: latestData.gnssType,
        satellites: latestData.satellites,
        signalStrength: latestData.signalStrength
      };
    }
    
    return device;
  }

  // Create new device
  async createDevice(deviceData) {
    return await prisma.device.create({
      data: deviceData
    });
  }

  // Update device status
  async updateDeviceStatus(imei, status, ipAddress = null) {
    return await prisma.device.update({
      where: { imei },
      data: {
        status,
        lastSeen: new Date(),
        ipAddress: ipAddress || undefined
      }
    });
  }

  // Add device log
  async addDeviceLog(deviceId, eventType, ipAddress, details = null) {
    return await prisma.deviceLog.create({
      data: {
        deviceId,
        eventType,
        ipAddress,
        details
      }
    });
  }

  // Save device GPS data to DeviceData table
  async saveDeviceData(deviceId, gpsData) {
    // Save to DeviceData table
    const deviceData = await prisma.deviceData.create({
      data: {
        deviceId,
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        speed: gpsData.speed,
        accStatus: gpsData.accStatus, // 0x00 = ACC OFF (0), 0x01 = ACC ON (1)
        gnssType: gpsData.gnssType || 'GPS',
        satellites: gpsData.satellites || 0,
        signalStrength: gpsData.signalStrength || 'Medium'
      }
    });
    
    // Update Device lastSeen timestamp
    await prisma.device.update({
      where: { id: deviceId },
      data: {
        lastSeen: new Date()
      }
    });
    
    return deviceData;
  }
  
  // Get latest location for a device
  async getDeviceLatestLocation(imei) {
    const device = await prisma.device.findUnique({
      where: { imei },
      include: {
        data: {
          take: 1,
          orderBy: { receivedAt: 'desc' }
        },
        vl502Locations: {
          take: 1,
          orderBy: { receivedAt: 'desc' }
        }
      }
    });
    
    if (!device) return null;

    // Handle VL502 data
    if ((device.deviceModel === 'VL502' || device.vl502Locations?.length > 0) && device.vl502Locations && device.vl502Locations.length > 0) {
      const latest = device.vl502Locations[0];
      return {
        latitude: latest.latitude,
        longitude: latest.longitude,
        speed: latest.speed,
        accStatus: latest.accOn ? 1 : 0,
        gnssType: 'GPS', // Default for VL502
        satellites: latest.satelliteCount || 0,
        signalStrength: latest.signalStrength || 'Medium',
        address: latest.address,
        lastSeen: latest.receivedAt
      };
    }
    
    // Return location from Device model or latest from DeviceData
    if (device.latitude && device.longitude) {
      return {
        latitude: device.latitude,
        longitude: device.longitude,
        speed: device.speed,
        accStatus: device.accStatus,
        gnssType: device.gnssType,
        satellites: device.satellites,
        signalStrength: device.signalStrength,
        address: device.address,
        lastSeen: device.lastSeen
      };
    } else if (device.data && device.data.length > 0) {
      const latest = device.data[0];
      return {
        latitude: latest.latitude,
        longitude: latest.longitude,
        speed: latest.speed,
        accStatus: latest.accStatus,
        lastSeen: latest.receivedAt
      };
    }
    
    return null;
  }

  // Update device location and information
  async updateDeviceLocation(imei, locationData) {
    return await prisma.device.update({
      where: { imei },
      data: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        address: locationData.address,
        speed: locationData.speed,
        accStatus: locationData.accStatus,
        gnssType: locationData.gnssType,
        satellites: locationData.satellites,
        signalStrength: locationData.signalStrength,
        lastSeen: new Date()
      }
    });
  }
}

export default new DeviceModel();