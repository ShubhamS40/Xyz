import deviceModel from '../../model/deviceModel.js';
import prisma from '../../config/database.js';

// Helper function to determine if device is actually online based on lastSeen
function isDeviceOnline(lastSeen) {
  if (!lastSeen) return false;
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now - lastSeenDate;
  const diffMinutes = diffMs / (1000 * 60);
  // Consider device online if lastSeen is within 4 minutes
  return diffMinutes <= 4;
}

class DeviceController {

  // Get all devices with location
  async getAllDevices(req, res) {
    try {
      const devices = await deviceModel.getAllDevices();
      
      // Format response to include location data from DeviceData
      const formattedDevices = devices.map(device => {
        // Get latest location from DeviceData if available
        const latestData = device.data && device.data.length > 0 ? device.data[0] : null;
        
        // Calculate actual online status based on lastSeen
        const isOnline = isDeviceOnline(device.lastSeen);
        const actualStatus = isOnline ? 'active' : 'inactive';
        
        return {
          id: device.id,
          imei: device.imei,
          deviceName: device.deviceName,
          deviceModel: device.deviceModel,
          status: actualStatus, // Use calculated status instead of stored status
          lastSeen: device.lastSeen,
          ipAddress: device.ipAddress,
          serverIp: device.serverIp,
          serverPort: device.serverPort,
          // Location fields from DeviceData or Device model
          latitude: device.latitude || (latestData ? latestData.latitude : null),
          longitude: device.longitude || (latestData ? latestData.longitude : null),
          speed: device.speed || (latestData ? latestData.speed : null),
          accStatus: device.accStatus || (latestData ? latestData.accStatus : null),
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
          _count: device._count
        };
      });
      
      res.json({
        success: true,
        count: formattedDevices.length,
        data: formattedDevices
      });
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch devices',
        error: error.message
      });
    }
  }

  // Get device by IMEI
  async getDeviceByIMEI(req, res) {
    try {
      const { imei } = req.params;
      const device = await deviceModel.getDeviceByIMEI(imei);
      
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      // Get latest location from DeviceData if available
      const latestData = device.data && device.data.length > 0 ? device.data[0] : null;
      
      // Calculate actual online status based on lastSeen
      const isOnline = isDeviceOnline(device.lastSeen);
      const actualStatus = isOnline ? 'active' : 'inactive';
      
      const formattedDevice = {
        ...device,
        status: actualStatus, // Use calculated status instead of stored status
        latitude: device.latitude || (latestData ? latestData.latitude : null),
        longitude: device.longitude || (latestData ? latestData.longitude : null),
        speed: device.speed || (latestData ? latestData.speed : null),
        accStatus: device.accStatus || (latestData ? latestData.accStatus : null)
      };

      res.json({
        success: true,
        data: formattedDevice
      });
    } catch (error) {
      console.error('Error fetching device:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch device',
        error: error.message
      });
    }
  }

  // Add new device manually
  async addDevice(req, res) {
    try {
      const { imei, deviceName, deviceModel } = req.body;

      if (!imei) {
        return res.status(400).json({
          success: false,
          message: 'IMEI is required'
        });
      }

      // Check if device already exists
      const existingDevice = await deviceModel.getDeviceByIMEI(imei);
      if (existingDevice) {
        return res.status(400).json({
          success: false,
          message: 'Device with this IMEI already exists'
        });
      }

      const device = await deviceModel.createDevice({
        imei,
        deviceName: deviceName || `Device-${imei.slice(-4)}`,
        deviceModel: deviceModel || 'JC261',
        status: 'inactive'
      });

      res.status(201).json({
        success: true,
        message: 'Device added successfully',
        data: device
      });
    } catch (error) {
      console.error('Error adding device:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add device',
        error: error.message
      });
    }
  }

  // Update device status manually
  async updateDeviceStatus(req, res) {
    try {
      const { imei } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Use "active" or "inactive"'
        });
      }

      const device = await deviceModel.updateDeviceStatus(imei, status);

      res.json({
        success: true,
        message: 'Device status updated',
        data: device
      });
    } catch (error) {
      console.error('Error updating device:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update device',
        error: error.message
      });
    }
  }

  // Delete device
  async deleteDevice(req, res) {
    try {
      const { imei } = req.params;

      await prisma.device.delete({
        where: { imei }
      });

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting device:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete device',
        error: error.message
      });
    }
  }
}

export default new DeviceController();
