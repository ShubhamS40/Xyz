import prisma from '../../../../config/database.js';

export const addDeviceInventory = async (req, res) => {
  try {
    const {
      deviceModel,
      imei,
      status,
      vendor,
      category,
      unitPrice,
      companyName,
      assignedToType,
      assignedToId,
      assignedToName,
      activationDate,
      cameraChannels
    } = req.body;

    // Validation
    if (!imei || !deviceModel || !category) {
      return res.status(400).json({
        success: false,
        message: 'IMEI, deviceModel, and category are required'
      });
    }

    // Check if device with same IMEI already exists in inventory
    const existingInventory = await prisma.deviceInventory.findUnique({
      where: { imei }
    });

    if (existingInventory) {
      return res.status(409).json({
        success: false,
        message: 'Device with this IMEI already exists in inventory'
      });
    }

    // Validation for dashcam category
    if (category === 'dashcam' && !cameraChannels) {
      return res.status(400).json({
        success: false,
        message: 'Camera channels are required for dashcam devices'
      });
    }

    // Create new device inventory item
    const createdItem = await prisma.deviceInventory.create({
      data: {
      deviceModel,
      imei,
        status: status || 'unassigned',
        vendor: vendor || null,
      category,
        unitPrice: unitPrice || null,
        companyName: companyName || null,
        assignedToType: assignedToType || null,
        assignedToId: assignedToId || null,
        assignedToName: assignedToName || null,
        activationDate: activationDate ? new Date(activationDate) : null,
        cameraChannels: category === 'dashcam' && cameraChannels ? parseInt(cameraChannels) : null
      }
    });

    // Map to camelCase
    const mappedItem = {
      id: createdItem.id,
      deviceModel: createdItem.deviceModel,
      imei: createdItem.imei,
      status: createdItem.status,
      vendor: createdItem.vendor,
      category: createdItem.category,
      unitPrice: createdItem.unitPrice,
      companyName: createdItem.companyName,
      assignedToType: createdItem.assignedToType,
      assignedToId: createdItem.assignedToId,
      assignedToName: createdItem.assignedToName,
      activationDate: createdItem.activationDate,
      cameraChannels: createdItem.cameraChannels,
      createdAt: createdItem.createdAt,
      updatedAt: createdItem.updatedAt
    };

    return res.status(201).json({
      success: true,
      message: 'Device inventory added successfully',
      data: mappedItem
    });

  } catch (error) {
    console.error('Error adding device inventory:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add device inventory',
      error: error.message
    });
  }
};
