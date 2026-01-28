import prisma from '../../../../config/database.js';


export const getDeviceByImei = async (req, res) => {
  try {
    const { imei } = req.params;

    const device = await prisma.device.findUnique({
      where: { imei },
      include: {
        data: {
          take: 50,
          orderBy: {
            receivedAt: 'desc'
          }
        },
        logs: {
          take: 20,
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device fetched successfully',
      data: device
    });

  } catch (error) {
    console.error('Error fetching device:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch device',
      error: error.message
    });
  }
};

// ==================== UPDATE DEVICE STATUS ====================
export const updateDeviceStatus = async (req, res) => {
  try {
    const { imei } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const device = await prisma.device.update({
      where: { imei },
      data: { 
        status,
        lastSeen: new Date()
      }
    });

    // Create log
    await prisma.deviceLog.create({
      data: {
        deviceId: device.id,
        eventType: 'status_changed',
        ipAddress: req.ip || req.connection.remoteAddress,
        details: `Status changed to ${status}`
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Device status updated successfully',
      data: device
    });

  } catch (error) {
    console.error('Error updating device status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update device status',
      error: error.message
    });
  }
};