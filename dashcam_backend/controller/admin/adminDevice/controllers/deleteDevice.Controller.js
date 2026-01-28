import prisma from '../../../../config/database.js';


export const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if device exists
    const existingDevice = await prisma.device.findUnique({
      where: { id: parseInt(id) },
      include: {
        data: true,
        logs: true
      }
    });

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Delete device (cascade will delete related data and logs)
    await prisma.device.delete({
      where: { id: parseInt(id) }
    });

    return res.status(200).json({
      success: true,
      message: 'Device deleted successfully',
      data: {
        deletedDevice: {
          id: existingDevice.id,
          imei: existingDevice.imei,
          deviceName: existingDevice.deviceName
        },
        deletedRecords: {
          deviceData: existingDevice.data.length,
          deviceLogs: existingDevice.logs.length
        }
      }
    });

  } catch (error) {
    console.error('Error deleting device:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete device',
      error: error.message
    });
  }
};