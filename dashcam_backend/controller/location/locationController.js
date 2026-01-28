import deviceModel from '../../model/deviceModel.js';
import prisma from '../../config/database.js';

class LocationController {
  // Get latest location for a device
  async getDeviceLocation(req, res) {
    try {
      const { imei } = req.params;
      
      const location = await deviceModel.getDeviceLatestLocation(imei);
      
      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Device location not found'
        });
      }

      res.json({
        success: true,
        data: location
      });
    } catch (error) {
      console.error('Error fetching device location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch device location',
        error: error.message
      });
    }
  }

  // Get all devices with locations
  async getAllDevicesLocations(req, res) {
    try {
      const devices = await deviceModel.getAllDevices();
      
      const locations = devices
        .filter(device => device.latitude && device.longitude)
        .map(device => ({
          imei: device.imei,
          deviceName: device.deviceName,
          deviceModel: device.deviceModel,
          status: device.status,
          latitude: device.latitude,
          longitude: device.longitude,
          speed: device.speed || 0,
          accStatus: device.accStatus || 0,
          address: device.address,
          lastSeen: device.lastSeen
        }));

      res.json({
        success: true,
        count: locations.length,
        data: locations
      });
    } catch (error) {
      console.error('Error fetching devices locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch devices locations',
        error: error.message
      });
    }
  }

  // Get location history for a device
  async getDeviceLocationHistory(req, res) {
    try {
      const { imei } = req.params;
      const { limit = 100, startDate, endDate } = req.query;
      
      const device = await prisma.device.findUnique({
        where: { imei },
        select: { id: true }
      });
      
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      const where = { deviceId: device.id };
      
      if (startDate || endDate) {
        where.receivedAt = {};
        if (startDate) where.receivedAt.gte = new Date(startDate);
        if (endDate) where.receivedAt.lte = new Date(endDate);
      }

      const history = await prisma.deviceData.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        take: parseInt(limit),
        select: {
          latitude: true,
          longitude: true,
          speed: true,
          accStatus: true,
          receivedAt: true
        }
      });

      res.json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      console.error('Error fetching location history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch location history',
        error: error.message
      });
    }
  }

  // Get live location (latest location from database)
  async getLiveLocation(req, res) {
    try {
      const { imei } = req.params;
      
      const device = await prisma.device.findUnique({
        where: { imei },
        include: {
          data: {
            take: 1,
            orderBy: { receivedAt: 'desc' }
          }
        }
      });
      
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      if (!device.data || device.data.length === 0) {
        // Calculate status based on lastSeen if no location data
        let actualStatus = 'offline';
        if (device.lastSeen) {
          const lastSeenTime = new Date(device.lastSeen).getTime();
          const now = Date.now();
          const diffMinutes = (now - lastSeenTime) / (1000 * 60);
          actualStatus = diffMinutes <= 4 ? 'online' : 'offline';
        }
        
        return res.json({
          success: true,
          data: {
            imei: device.imei,
            deviceName: device.deviceName,
            deviceModel: device.deviceModel,
            latitude: null,
            longitude: null,
            speed: null,
            accStatus: null,
            gnssType: null,
            satellites: null,
            signalStrength: null,
            receivedAt: null,
            lastSeen: device.lastSeen,
            status: actualStatus, // Calculated based on 4-minute threshold
            message: 'No location data available yet. Device may need time to acquire GPS signal.'
          }
        });
      }

      const latestData = device.data[0];
      
      // Calculate actual status based on receivedAt timestamp
      // Device is online if location data received within last 4 minutes
      let actualStatus = device.status;
      if (latestData.receivedAt) {
        const lastDataTime = new Date(latestData.receivedAt).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastDataTime) / (1000 * 60);
        actualStatus = diffMinutes <= 4 ? 'online' : 'offline';
      } else if (device.lastSeen) {
        const lastSeenTime = new Date(device.lastSeen).getTime();
        const now = Date.now();
        const diffMinutes = (now - lastSeenTime) / (1000 * 60);
        actualStatus = diffMinutes <= 4 ? 'online' : 'offline';
      } else {
        actualStatus = 'offline';
      }
      
      res.json({
        success: true,
        data: {
          imei: device.imei,
          deviceName: device.deviceName,
          deviceModel: device.deviceModel,
          latitude: latestData.latitude,
          longitude: latestData.longitude,
          speed: latestData.speed,
          accStatus: latestData.accStatus, // 0x00 = 0 (OFF), 0x01 = 1 (ON)
          gnssType: latestData.gnssType || 'GPS',
          satellites: latestData.satellites || 0,
          signalStrength: latestData.signalStrength || 'Medium',
          receivedAt: latestData.receivedAt,
          lastSeen: device.lastSeen,
          status: actualStatus // Calculated based on 4-minute threshold
        }
      });
    } catch (error) {
      console.error('Error fetching live location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch live location',
        error: error.message
      });
    }
  }

  // Save location data endpoint (kept for backward compatibility)
  // Note: tcpServer.js now handles location data saving directly to database
  async saveLocationData(req, res) {
    try {
      const { imei, latitude, longitude, speed, accStatus, satellites, course, timestamp } = req.body;

      if (!imei || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: imei, latitude, longitude'
        });
      }

      // Get or create device
      let device = await prisma.device.findUnique({
        where: { imei }
      });

      if (!device) {
        // Create device if it doesn't exist
        device = await prisma.device.create({
          data: {
            imei,
            deviceName: `JC261-${imei.slice(-4)}`,
            deviceModel: 'JC261',
            status: 'active',
            lastSeen: new Date()
          }
        });
        console.log(`✅ New device created: ${imei}`);
      }

      // Save location data to DeviceData table
      const deviceData = await prisma.deviceData.create({
        data: {
          deviceId: device.id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          speed: speed !== undefined ? parseFloat(speed) : null,
          accStatus: accStatus !== undefined ? parseInt(accStatus) : null
        }
      });

      // Update device last seen
      await prisma.device.update({
        where: { id: device.id },
        data: {
          status: 'active',
          lastSeen: new Date()
        }
      });

      console.log(`📍 Location saved for IMEI ${imei}: Lat ${latitude}, Lon ${longitude}, Speed: ${speed} km/h`);

      res.json({
        success: true,
        message: 'Location data saved successfully',
        data: {
          id: deviceData.id,
          imei,
          latitude,
          longitude,
          speed,
          accStatus,
          receivedAt: deviceData.receivedAt
        }
      });
    } catch (error) {
      console.error('Error saving location data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save location data',
        error: error.message
      });
    }
  }
}

export default new LocationController();
