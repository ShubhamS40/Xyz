import prisma from '../../../../config/database.js';

// ==================== ADD DEVICE ====================
export const addDevice = async (req, res) => {
  try {
    const {
      imei,
      deviceName,
      deviceModel,
      status,
      ipAddress,
      serverIp,
      serverPort,
      lastSeen
    } = req.body;

    // Validation
    if (!imei) {
      return res.status(400).json({
        success: false,
        message: 'IMEI is required'
      });
    }

    // Check if device with same IMEI already exists
    const existingDevice = await prisma.device.findUnique({
      where: { imei }
    });

    if (existingDevice) {
      return res.status(409).json({
        success: false,
        message: 'Device with this IMEI already exists'
      });
    }

    // Create new device
    const newDevice = await prisma.device.create({
      data: {
        imei,
        deviceName: deviceName || null,
        deviceModel: deviceModel || 'JC261',
        status: status || 'inactive',
        ipAddress: ipAddress || null,
        serverIp: serverIp || null,
        serverPort: serverPort || null,
        lastSeen: lastSeen ? new Date(lastSeen) : null
      }
    });

    // Create device log for creation event
    await prisma.deviceLog.create({
      data: {
        deviceId: newDevice.id,
        eventType: 'device_created',
        ipAddress: req.ip || req.connection.remoteAddress,
        details: `Device ${deviceName || imei} created successfully`
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Device added successfully',
      data: newDevice
    });

  } catch (error) {
    console.error('Error adding device:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add device',
      error: error.message
    });
  }
};
