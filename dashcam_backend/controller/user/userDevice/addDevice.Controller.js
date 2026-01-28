import prisma from '../../../config/database.js';

// User Add Device - Move from inventory to device management
export const addDevice = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { imei, deviceName } = req.body;

    if (!imei) {
      return res.status(400).json({
        success: false,
        message: 'IMEI is required'
      });
    }

    // Check if device already exists in device management
    const existingDevice = await prisma.device.findUnique({
      where: { imei }
    });

    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: 'Device already exists in device management'
      });
    }

    // Check if device exists in inventory
    const inventoryDevice = await prisma.deviceInventory.findUnique({
      where: { imei }
    });

    if (!inventoryDevice) {
      return res.status(404).json({
        success: false,
        message: 'Device not found in inventory'
      });
    }

    // Check if device is unassigned
    if (inventoryDevice.status !== 'unassigned') {
      return res.status(400).json({
        success: false,
        message: 'Device is already assigned'
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, companyName: true }
    });

    // Create device in device management
    const device = await prisma.device.create({
      data: {
        imei: inventoryDevice.imei,
        deviceName: deviceName || `Device-${imei.slice(-4)}`,
        deviceModel: inventoryDevice.deviceModel,
        status: 'inactive', // Will change to online/offline when logs are received
        category: inventoryDevice.category,
        vendor: inventoryDevice.vendor,
        unitPrice: inventoryDevice.unitPrice,
        companyName: user.companyName || inventoryDevice.companyName,
        assignedToType: 'user',
        assignedToId: userId,
        assignedToName: user.companyName || user.email,
        activationDate: null // Will be set when first log is received
      }
    });

    // Delete device from inventory (it's now in device management)
    // Once assigned, device should not appear in inventory anymore
    await prisma.deviceInventory.delete({
      where: { imei }
    });

    res.status(201).json({
      success: true,
      message: 'Device added successfully and removed from inventory',
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
};
