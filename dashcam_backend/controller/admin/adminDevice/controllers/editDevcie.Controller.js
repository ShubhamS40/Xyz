
import prisma from '../../../../config/database.js';


export const editDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      deviceName,
      deviceModel,
      status,
      ipAddress,
      serverIp,
      serverPort,
      lastSeen,
      imei
    } = req.body;

    // Check if device exists
    const existingDevice = await prisma.device.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Prepare update data
    const updateData = {};
    if (deviceName !== undefined) updateData.deviceName = deviceName;
    if (deviceModel !== undefined) updateData.deviceModel = deviceModel;
    if (status !== undefined) updateData.status = status;
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
    if (serverIp !== undefined) updateData.serverIp = serverIp;
    if (serverPort !== undefined) updateData.serverPort = serverPort;
    if (lastSeen !== undefined) updateData.lastSeen = lastSeen ? new Date(lastSeen) : null;
    // Note: IMEI cannot be updated as it's unique identifier

    // Update device
    const updatedDevice = await prisma.device.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Create device log for update event
    await prisma.deviceLog.create({
      data: {
        deviceId: updatedDevice.id,
        eventType: 'device_updated',
        ipAddress: req.ip || req.connection.remoteAddress,
        details: `Device ${updatedDevice.deviceName || updatedDevice.imei} updated`
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Device updated successfully',
      data: updatedDevice
    });

  } catch (error) {
    console.error('Error updating device:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update device',
      error: error.message
    });
  }
};